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

// Calculates best substring similarity between two normalized strings
function calculateSimilarity(a: string, b: string): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  
  if (normA.includes(normB) || normB.includes(normA)) {
    return 1.0;
  }
  
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

// Helper to check if a phone number exists in raw text by comparing digit-only representations
function containsPhoneIgnoreCase(text: string, search: string | number | null | undefined): boolean {
  if (search === null || search === undefined) return false;
  const searchDigits = String(search).replace(/\D/g, "");
  const textDigits = text.replace(/\D/g, "");
  if (!searchDigits) return false;
  return textDigits.includes(searchDigits);
}

// Helper to check if a prescription number exists in raw text by comparing alphanumeric-only representations
function containsAlphanumericIgnoreCase(text: string, search: string | number | null | undefined): boolean {
  if (search === null || search === undefined) return false;
  const searchClean = String(search).toLowerCase().replace(/[^a-z0-9]/g, "");
  const textClean = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!searchClean) return false;
  return textClean.includes(searchClean);
}

// Clean list/form keywords from OCR lines for matching
function cleanOcrLine(line: string): string {
  return line
    .replace(/\b(?:qty|qnty|quantity|x|count|total)\s*:?\s*[0-9]+\b/gi, "")
    .replace(/^\s*[0-9]+[\s.)-]/, "")
    .replace(/\b(?:tab|tabs|tablet|tablets|cap|caps|capsule|capsules|syr|syrup|inj|injection|drops)\b/gi, "")
    .trim();
}

// Extract patient details using regex matching
function extractPatientInfo(text: string) {
  let prescriptionNumber: string | null = null;
  let name: string | null = null;
  let address: string | null = null;
  let mobile: string | null = null;
  let gender: string | null = null;
  let age: number | null = null;

  const rxNoPatterns = [
    /(?:rx\s*no|rx|prescription\s*no|prescription|sr\s*no|serial\s*no)[:.\s-]*([a-zA-Z0-9-]+)/i,
    /(?:sr\.?\s*no)[:.\s-]*([a-zA-Z0-9-]+)/i
  ];
  for (const pattern of rxNoPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      prescriptionNumber = match[1].trim();
      break;
    }
  }

  const namePatterns = [
    /(?:patient\s*name|name)[:.\s-]*([a-zA-Z\s.]+)/i
  ];
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let cleanedName = match[1].split(/\n|\r/)[0].trim();
      cleanedName = cleanedName.replace(/\b(?:age|sex|gender|mobile|phone|contact|date)\b.*/i, "").trim();
      if (cleanedName) {
        name = cleanedName;
        break;
      }
    }
  }

  const addressPatterns = [
    /(?:patient\s*address|address)[:.\s-]*([^\n\r]+)/i
  ];
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      address = match[1].trim();
      break;
    }
  }

  const mobilePatterns = [
    /(?:mobile|phone|contact|tel)[:.\s-]*([0-9\s-]{10,15})/i
  ];
  for (const pattern of mobilePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const digits = match[1].replace(/\D/g, "");
      if (digits.length >= 10) {
        mobile = digits.slice(-10);
        break;
      }
    }
  }

  const genderPatterns = [
    /\b(?:sex|gender)[:.\s-]*([a-zA-Z]+)/i
  ];
  for (const pattern of genderPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const g = match[1].trim().toLowerCase();
      if (g.startsWith("m")) gender = "Male";
      else if (g.startsWith("f")) gender = "Female";
      else gender = match[1].trim();
      break;
    }
  }

  const agePatterns = [
    /\bage[:.\s-]*([0-9]+)\b/i
  ];
  for (const pattern of agePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      age = parseInt(match[1], 10);
      break;
    }
  }

  return {
    prescriptionNumber,
    patient: {
      name,
      address,
      mobile,
      gender,
      age
    }
  };
}

// Extract quantity from text line
function extractQuantity(line: string): number {
  const qtyRegex = /(?:qty|qnty|quantity|x|count|total|-|\*)\s*:?\s*([0-9]+)/i;
  const match = line.match(qtyRegex);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  const allNumbers = line.match(/\b([0-9]+)\b/g);
  if (allNumbers && allNumbers.length > 0) {
    const lastMatch = line.match(/\b([0-9]+)\s*$/);
    if (lastMatch) {
      return parseInt(lastMatch[1], 10);
    }
    return parseInt(allNumbers[0], 10);
  }
  
  return 1;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const serviceUrl = process.env.PADDLEOCR_SERVICE_URL;
    if (!serviceUrl) {
      console.error("PADDLEOCR_SERVICE_URL is not defined in environment variables");
      return NextResponse.json({ success: false, error: "OCR service unavailable" }, { status: 500 });
    }

    let rawText = "";

    // Forward file to the external PaddleOCR service
    const ocrFormData = new FormData();
    ocrFormData.append("file", file);

    try {
      const ocrResponse = await fetch(serviceUrl, {
        method: "POST",
        body: ocrFormData,
      });

      if (!ocrResponse.ok) {
        throw new Error(`PaddleOCR service returned status ${ocrResponse.status}`);
      }

      const ocrResult = await ocrResponse.json();
      if (!ocrResult.success) {
        throw new Error(ocrResult.error || "PaddleOCR service failed");
      }

      rawText = ocrResult.text || "";
    } catch (err) {
      console.error("External PaddleOCR request failed:", err);
      return NextResponse.json({ success: false, error: "OCR service unavailable" }, { status: 500 });
    }

    rawText = rawText.trim();
    if (!rawText) {
      return NextResponse.json({ success: false, error: "Unable to scan prescription" }, { status: 500 });
    }

    const lines = rawText.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => ({
        text: line,
        confidence: 1.0
      }));

    // 2. Extraction Engine
    const { prescriptionNumber, patient } = extractPatientInfo(rawText);

    // 3. Medicine Matching against Database
    const allDbMedicines = await prisma.medicine.findMany();
    const verifiedMedicines: any[] = [];

    for (const ocrLine of lines) {
      const cleaned = cleanOcrLine(ocrLine.text);
      if (cleaned.length < 5) continue; // Skip lines that are too short to be medicines

      let bestMatch: any = null;
      let highestScore = 0;

      for (const dbMed of allDbMedicines) {
        const score = calculateSimilarity(cleaned, dbMed.name);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = dbMed;
        }
      }

      // Similarity Score serves as our fuzzy matching score. Accept only matches >= 85% (0.85).
      if (highestScore >= 0.85 && bestMatch) {
        const qty = extractQuantity(ocrLine.text);
        
        // Prevent duplicate items
        if (!verifiedMedicines.some((item) => item.id === bestMatch.id)) {
          verifiedMedicines.push({
            id: bestMatch.id,
            name: bestMatch.name,
            price: bestMatch.price,
            stock: bestMatch.stock,
            quantity: qty,
            confidence: ocrLine.confidence
          });
        }
      }
    }

    // 4. Validation Layer: Ensure all returned values exist in OCR text (if not, set to null)
    let finalRxNo = prescriptionNumber;
    if (finalRxNo && !containsAlphanumericIgnoreCase(rawText, finalRxNo)) {
      finalRxNo = null;
    }

    const finalPatient = {
      name: patient.name && containsIgnoreCase(rawText, patient.name) ? patient.name : null,
      address: patient.address && containsIgnoreCase(rawText, patient.address) ? patient.address : null,
      mobile: patient.mobile && containsPhoneIgnoreCase(rawText, patient.mobile) ? patient.mobile : null,
      gender: patient.gender && (
        containsIgnoreCase(rawText, patient.gender) ||
        (patient.gender === "Male" && /\b(?:sex|gender)[:.\s-]*m\b/i.test(rawText)) ||
        (patient.gender === "Female" && /\b(?:sex|gender)[:.\s-]*f\b/i.test(rawText))
      ) ? patient.gender : null,
      age: patient.age && containsIgnoreCase(rawText, patient.age) ? patient.age : null
    };

    const patientObj: Record<string, any> = {};
    if (finalPatient.name) patientObj.name = finalPatient.name;
    if (finalPatient.address) patientObj.address = finalPatient.address;
    if (finalPatient.mobile) patientObj.mobile = finalPatient.mobile;
    if (finalPatient.gender) patientObj.gender = finalPatient.gender;
    if (finalPatient.age) patientObj.age = finalPatient.age;

    // Construct response matching expected frontend structure and root structure
    const responsePayload = {
      success: true,
      prescriptionNumber: finalRxNo || "",
      patient: patientObj,
      medicines: verifiedMedicines,
      data: {
        prescriptionNumber: finalRxNo || "",
        patient: patientObj,
        medicines: verifiedMedicines
      }
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("OCR API route error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to scan prescription" },
      { status: 500 }
    );
  }
}
