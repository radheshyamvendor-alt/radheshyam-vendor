import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Jimp } from "jimp";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";

// Disable PDF.js web worker in Node.js/server environment
pdfjs.GlobalWorkerOptions.workerSrc = "";

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

// OCR preprocessing using Jimp: grayscale, contrast, sharpening, noise reduction
async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  const image = await Jimp.read(imageBuffer);
  
  // 1. Grayscale
  image.greyscale();
  
  // 2. Contrast Enhancement (takes a value between -1 and 1)
  image.contrast(0.2); 
  
  // 3. Sharpening (convolve kernel)
  image.convolute([
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ]);
  
  return await image.getBuffer("image/png");
}

// Extract images from scanned PDF pages
async function extractImagesFromPdf(pdfBuffer: Buffer): Promise<Buffer[]> {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: false,
    disableFontFace: true,
  }).promise;

  const images: Buffer[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const ops = await page.getOperatorList();
    
    for (let j = 0; j < ops.fnArray.length; j++) {
      const fn = ops.fnArray[j];
      if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
        const imgKey = ops.argsArray[j][0];
        const img = await new Promise<any>((resolve) => {
          page.objs.get(imgKey, (obj: any) => resolve(obj));
        });
        
        if (img && img.width && img.height && img.data) {
          const jimpImage = new Jimp({ width: img.width, height: img.height });
          const totalPixels = img.width * img.height;
          const targetData = jimpImage.bitmap.data;
          
          if (img.data.length === totalPixels * 4) {
            // RGBA
            Buffer.from(img.data).copy(targetData);
          } else if (img.data.length === totalPixels * 3) {
            // RGB
            let srcIdx = 0;
            let dstIdx = 0;
            for (let p = 0; p < totalPixels; p++) {
              targetData[dstIdx] = img.data[srcIdx];
              targetData[dstIdx + 1] = img.data[srcIdx + 1];
              targetData[dstIdx + 2] = img.data[srcIdx + 2];
              targetData[dstIdx + 3] = 255;
              srcIdx += 3;
              dstIdx += 4;
            }
          } else if (img.data.length === totalPixels) {
            // Grayscale
            let dstIdx = 0;
            for (let p = 0; p < totalPixels; p++) {
              const val = img.data[p];
              targetData[dstIdx] = val;
              targetData[dstIdx + 1] = val;
              targetData[dstIdx + 2] = val;
              targetData[dstIdx + 3] = 255;
              dstIdx += 4;
            }
          }
          
          const buffer = await jimpImage.getBuffer("image/png");
          images.push(buffer);
        }
      }
    }
  }
  
  return images;
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

  // 1. Prescription Number
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

  // 2. Patient Name
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

  // 3. Address
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

  // 4. Mobile
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

  // 5. Gender
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

  // 6. Age
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

    const fileBytes = await file.arrayBuffer();
    let rawText = "";

    // 1. Text / PDF Extraction
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(fileBytes),
        useSystemFonts: false,
        disableFontFace: true,
      }).promise;

      let textLayer = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        textLayer += pageText + "\n";
      }

      if (textLayer.trim().length > 100) {
        rawText = textLayer;
      } else {
        // Scanned PDF: Extract images and run Tesseract OCR
        const pageImages = await extractImagesFromPdf(Buffer.from(fileBytes));
        const worker = await createWorker("eng", 1, { cachePath: "/tmp" });
        
        let ocrText = "";
        for (const imgBuffer of pageImages) {
          const preprocessed = await preprocessImage(imgBuffer);
          const { data: { text } } = await worker.recognize(preprocessed);
          ocrText += text + "\n";
        }
        await worker.terminate();
        rawText = ocrText;
      }
    } else {
      // Direct Image: Run Tesseract OCR
      const preprocessed = await preprocessImage(Buffer.from(fileBytes));
      const worker = await createWorker("eng", 1, { cachePath: "/tmp" });
      const { data: { text } } = await worker.recognize(preprocessed);
      await worker.terminate();
      rawText = text;
    }

    rawText = rawText.trim();
    if (!rawText) {
      return NextResponse.json({ success: false, error: "Unable to extract text from prescription" }, { status: 500 });
    }

    // 2. Extraction Engine
    const { prescriptionNumber, patient } = extractPatientInfo(rawText);

    // 3. Medicine Matching against Database
    const allDbMedicines = await prisma.medicine.findMany();
    const lines = rawText.split(/\r?\n/);
    const verifiedMedicines: any[] = [];

    for (const line of lines) {
      const cleaned = cleanOcrLine(line);
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

      // Similarity Score serves as our Confidence Score. Accept only matches >= 85% (0.85).
      // Since 0.85 >= 0.70, it automatically satisfies confidence >= 0.70.
      if (highestScore >= 0.85 && bestMatch) {
        const qty = extractQuantity(line);
        
        // Prevent duplicate items
        if (!verifiedMedicines.some((item) => item.id === bestMatch.id)) {
          verifiedMedicines.push({
            id: bestMatch.id,
            name: bestMatch.name,
            price: bestMatch.price,
            stock: bestMatch.stock,
            quantity: qty,
            confidence: highestScore
          });
        }
      }
    }

    // 4. Validation Layer: Ensure all returned values exist in OCR text (if not, set to null)
    let finalRxNo = prescriptionNumber;
    if (finalRxNo && !containsIgnoreCase(rawText, finalRxNo)) {
      finalRxNo = null;
    }

    const finalPatient = {
      name: patient.name && containsIgnoreCase(rawText, patient.name) ? patient.name : null,
      address: patient.address && containsIgnoreCase(rawText, patient.address) ? patient.address : null,
      mobile: patient.mobile && containsIgnoreCase(rawText, patient.mobile) ? patient.mobile : null,
      gender: patient.gender && containsIgnoreCase(rawText, patient.gender) ? patient.gender : null,
      age: patient.age && containsIgnoreCase(rawText, patient.age) ? patient.age : null
    };

    // Construct response matching expected frontend structure and root structure
    const responsePayload = {
      success: true,
      prescriptionNumber: finalRxNo,
      patient: finalPatient,
      medicines: verifiedMedicines,
      data: {
        prescriptionNumber: finalRxNo,
        patient: finalPatient,
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
