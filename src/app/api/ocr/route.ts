import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Normalization function to remove punctuation, spaces, and convert to lowercase
function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Standard Levenshtein distance algorithm
function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Substring Levenshtein similarity to find the best match for a short string inside a longer string
function getSubLevenshteinSimilarity(shortStr: string, longStr: string): number {
  if (shortStr.length === 0) return 0;
  
  if (longStr.includes(shortStr)) {
    return 1.0;
  }
  
  let minDistance = shortStr.length;
  const len = shortStr.length;
  for (let start = 0; start <= longStr.length - len + 2; start++) {
    for (let l = Math.max(1, len - 2); l <= len + 2; l++) {
      const end = start + l;
      if (end > longStr.length) continue;
      const sub = longStr.substring(start, end);
      const dist = getLevenshteinDistance(shortStr, sub);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  }
  
  return 1.0 - minDistance / len;
}

// Calculates best substring similarity between two strings
function calculateSimilarity(a: string, b: string): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  
  const shortStr = normA.length < normB.length ? normA : normB;
  const longStr = normA.length < normB.length ? normB : normA;
  
  return getSubLevenshteinSimilarity(shortStr, longStr);
}

// Helper to check if search term exists in the raw text (ignoring double spaces/newlines)
function containsIgnoreCase(text: string, search: string | number | null | undefined): boolean {
  if (search === null || search === undefined) return false;
  const searchStr = String(search).toLowerCase().trim().replace(/\s+/g, " ");
  const textStr = text.toLowerCase().trim().replace(/\s+/g, " ");
  if (!searchStr) return false;
  return textStr.includes(searchStr);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const azureEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const azureKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

    if (!azureEndpoint || !azureKey) {
      console.error("Missing Azure Document Intelligence configuration");
      return NextResponse.json({ success: false, error: "Unable to extract text from prescription" }, { status: 500 });
    }

    const baseEndpoint = azureEndpoint.endsWith("/") ? azureEndpoint.slice(0, -1) : azureEndpoint;
    let analyzeUrl = "";
    if (baseEndpoint.includes("/documentintelligence") || baseEndpoint.includes("/formrecognizer")) {
      analyzeUrl = baseEndpoint;
    } else {
      analyzeUrl = `${baseEndpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;
    }

    const fileBytes = await file.arrayBuffer();

    // Call Azure Document Intelligence
    const response = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureKey,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: fileBytes,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Azure OCR request failed:", response.status, errText);
      return NextResponse.json({ success: false, error: "Unable to extract text from prescription" }, { status: 500 });
    }

    const operationLocation = response.headers.get("operation-location");
    if (!operationLocation) {
      console.error("Missing operation-location header in Azure response");
      return NextResponse.json({ success: false, error: "Unable to extract text from prescription" }, { status: 500 });
    }

    // Poll the Azure operation result
    let status = "running";
    let analyzeResult: any = null;
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await fetch(operationLocation, {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": azureKey,
        },
      });

      if (!pollResponse.ok) {
        console.error(`Azure polling failed at attempt ${attempt + 1}:`, pollResponse.statusText);
        break;
      }

      const pollData = await pollResponse.json();
      status = pollData.status;

      if (status === "succeeded") {
        analyzeResult = pollData.analyzeResult;
        break;
      } else if (status === "failed") {
        console.error("Azure OCR analysis failed status:", pollData);
        break;
      }
    }

    if (status !== "succeeded" || !analyzeResult || !analyzeResult.content) {
      console.error("Azure OCR did not succeed or returned empty content");
      return NextResponse.json({ success: false, error: "Unable to extract text from prescription" }, { status: 500 });
    }

    const extractedText = analyzeResult.content.trim();
    if (!extractedText) {
      return NextResponse.json({ success: false, error: "Unable to extract text from prescription" }, { status: 500 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.error("Missing OpenAI API Key");
      return NextResponse.json({ success: false, error: "OpenAI is not configured" }, { status: 500 });
    }

    // Call OpenAI GPT-4o-mini for structured JSON extraction
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a pharmaceutical prescription extraction engine.

Extract ONLY values present in the OCR text.

Never invent:
* patient names
* addresses
* phone numbers
* medicines
* quantities
* prescription numbers

If a field is missing return null.

Return valid JSON only.

Expected Output Format:
{
  "prescriptionNumber": "",
  "patient": {
    "name": "",
    "address": "",
    "mobile": null,
    "gender": "",
    "age": null
  },
  "medicines": [
    {
      "name": "",
      "quantity": null
    }
  ]
}`
          },
          {
            role: "user",
            content: extractedText,
          }
        ]
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error("OpenAI API request failed:", openaiResponse.status, errText);
      return NextResponse.json({ success: false, error: "Unable to extract text from prescription" }, { status: 500 });
    }

    const openaiData = await openaiResponse.json();
    const messageContent = openaiData.choices?.[0]?.message?.content;
    if (!messageContent) {
      console.error("Empty message content returned from OpenAI");
      return NextResponse.json({ success: false, error: "Unable to extract text from prescription" }, { status: 500 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(messageContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI JSON response:", parseError);
      return NextResponse.json({ success: false, error: "Unable to extract text from prescription" }, { status: 500 });
    }

    // 1. Validation Layer: Verify every extracted value exists in OCR text
    let prescriptionNo = parsed.prescriptionNumber ? String(parsed.prescriptionNumber) : null;
    if (prescriptionNo && !containsIgnoreCase(extractedText, prescriptionNo)) {
      prescriptionNo = null;
    }

    const patient = {
      name: parsed.patient?.name ? String(parsed.patient.name) : null,
      address: parsed.patient?.address ? String(parsed.patient.address) : null,
      mobile: parsed.patient?.mobile ? String(parsed.patient.mobile) : null,
      gender: parsed.patient?.gender ? String(parsed.patient.gender) : null,
      age: parsed.patient?.age !== null && parsed.patient?.age !== undefined ? Number(parsed.patient.age) : null,
    };

    if (patient.name && !containsIgnoreCase(extractedText, patient.name)) {
      patient.name = null;
    }
    if (patient.address && !containsIgnoreCase(extractedText, patient.address)) {
      patient.address = null;
    }
    if (patient.mobile && !containsIgnoreCase(extractedText, patient.mobile)) {
      patient.mobile = null;
    }
    if (patient.gender && !containsIgnoreCase(extractedText, patient.gender)) {
      patient.gender = null;
    }
    if (patient.age !== null && !containsIgnoreCase(extractedText, patient.age)) {
      patient.age = null;
    }

    let extractedMedicines = Array.isArray(parsed.medicines) ? parsed.medicines : [];
    // Ensure medicine name and quantity exist in OCR text
    extractedMedicines = extractedMedicines.filter((med: any) => {
      if (!med || !med.name) return false;
      const medName = String(med.name);
      if (!containsIgnoreCase(extractedText, medName)) {
        return false;
      }
      if (med.quantity === null || med.quantity === undefined) {
        return false;
      }
      if (!containsIgnoreCase(extractedText, med.quantity)) {
        return false;
      }
      return true;
    });

    // 2. Database Verification Layer
    const allDbMedicines = await prisma.medicine.findMany();
    const verifiedMedicines: any[] = [];

    for (const extMed of extractedMedicines) {
      let bestMatch: any = null;
      let highestScore = 0;
      
      const normExtName = normalizeString(extMed.name);
      if (normExtName.length < 3) continue; // Skip single-character or overly short matches

      for (const dbMed of allDbMedicines) {
        const score = calculateSimilarity(extMed.name, dbMed.name);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = dbMed;
        }
      }

      // Accept matches only when similarity score >= 85%
      if (highestScore >= 0.85 && bestMatch) {
        verifiedMedicines.push({
          id: bestMatch.id,
          name: bestMatch.name,
          price: bestMatch.price,
          stock: bestMatch.stock,
          quantity: extMed.quantity !== null && extMed.quantity !== undefined ? Number(extMed.quantity) : 1
        });
      }
    }

    // Structure response: return root properties to satisfy prompt requirements AND data wrapper for compatibility
    const responsePayload = {
      success: true,
      prescriptionNumber: prescriptionNo,
      patient,
      medicines: verifiedMedicines,
      data: {
        prescriptionNumber: prescriptionNo,
        patient,
        medicines: verifiedMedicines
      }
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("OCR API route error:", error);
    const message = error instanceof Error ? error.message : "Unable to extract text from prescription";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
