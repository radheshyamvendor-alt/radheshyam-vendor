"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/providers/CartProvider";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";

interface ExtractedMedicine {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

interface ExtractedPatient {
  name: string;
  address: string;
  mobile: string;
  gender: string;
  age: number;
}

export default function OcrPage() {
  const { addMultipleToCart } = useCart();
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Scanned results states
  const [prescriptionNumber, setPrescriptionNumber] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<ExtractedPatient | null>(null);
  const [scannedMedicines, setScannedMedicines] = useState<ExtractedMedicine[]>([]);
  const [scanSuccess, setScanSuccess] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFileOcr(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFileOcr(files[0]);
    }
  };

  const processFileOcr = async (selectedFile: File) => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(selectedFile.type)) {
      setOcrError("Invalid file type. Please upload a PDF, PNG, JPG, or JPEG file.");
      return;
    }

    setIsOcrProcessing(true);
    setOcrError(null);
    setScanSuccess(false);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const resData = await response.json();
      if (resData.success) {
        const ocrData = resData.data;
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "radheshyam_scanned_rx",
            JSON.stringify({
              prescriptionNumber: ocrData.prescriptionNumber,
              patient: ocrData.patient,
            })
          );
        }
        setPrescriptionNumber(ocrData.prescriptionNumber);
        setPatientInfo(ocrData.patient);
        setScannedMedicines(ocrData.medicines);
        
        // Add to cart
        addMultipleToCart(ocrData.medicines);
        setScanSuccess(true);
      } else {
        setOcrError(resData.error || "OCR extraction failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Failed to communicate with OCR service.";
      setOcrError(errMsg);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const resetScanner = () => {
    setPrescriptionNumber(null);
    setPatientInfo(null);
    setScannedMedicines([]);
    setScanSuccess(false);
    setOcrError(null);
  };

  return (
    <div className="min-h-screen bg-background trust-gradient pb-24 md:pb-12 text-on-background">
      <Header />

      <main className="max-w-[800px] mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        <div className="space-y-6">
          
          {ocrError && (
            <div className="p-4 bg-error-container/20 border border-error/20 text-error rounded-xl flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{ocrError}</span>
            </div>
          )}

          {!scanSuccess ? (
            <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-8 glass-card space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-headline-sm font-bold text-on-surface">Prescription OCR Scanner</h3>
                <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                  Upload a prescription document (PDF or image). Our OCR engine will instantly parse it and add the medicines directly to your cart.
                </p>
              </div>

              {isOcrProcessing ? (
                /* Scanning Animation */
                <div className="h-64 border border-outline-variant rounded-2xl bg-surface-container-lowest flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-85 shadow-[0_0_10px_#003d9b] animate-[bounce_2.5s_infinite_linear]"></div>
                  <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <h4 className="mt-4 font-bold text-on-surface text-base">Radheshyam OCR Active</h4>
                  <p className="text-xs text-on-surface-variant mt-1 animate-pulse">Extracting credentials &amp; matching medicines...</p>
                </div>
              ) : (
                /* File Drop Area */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant bg-surface-container-lowest hover:border-primary/50"
                  }`}
                  onClick={() => document.getElementById("file-input-page")?.click()}
                >
                  <input
                    id="file-input-page"
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <span className="material-symbols-outlined text-[48px] text-primary mb-4 animate-bounce">
                    cloud_upload
                  </span>
                  <span className="font-bold text-on-surface text-base">Drag &amp; Drop Prescription File</span>
                  <span className="text-xs text-on-surface-variant mt-1">Supports PDF, PNG, JPG, JPEG</span>
                  <button
                    type="button"
                    className="mt-6 px-4 py-2 bg-surface border border-outline-variant rounded-xl font-label-md text-label-md text-on-surface hover:bg-surface-container transition-all"
                  >
                    Select Prescription
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Results & Success State */
            <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card space-y-6">
              <div className="flex items-center gap-3 p-4 bg-primary-container/10 border border-primary/20 text-primary rounded-xl">
                <span className="material-symbols-outlined text-[24px]">check_circle</span>
                <div>
                  <h4 className="font-bold text-sm">Prescription scanned successfully!</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">The extracted medicines have been added to your cart.</p>
                </div>
              </div>

              {/* Patient info card */}
              <div className="border border-outline-variant rounded-xl p-lg bg-surface-container-lowest space-y-4">
                <h4 className="font-bold text-on-surface border-b border-outline-variant pb-2 text-sm uppercase tracking-wider text-primary">Patient Profile</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-outline block">Patient Name</span>
                    <span className="font-semibold text-on-surface">{patientInfo?.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-outline block">Rx Number</span>
                    <span className="font-semibold text-on-surface">{prescriptionNumber}</span>
                  </div>
                  <div>
                    <span className="text-xs text-outline block">Mobile Number</span>
                    <span className="font-semibold text-on-surface">{patientInfo?.mobile}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-outline block">Residential Address</span>
                    <span className="font-semibold text-on-surface">{patientInfo?.address}</span>
                  </div>
                </div>
              </div>

              {/* Extracted medicines list */}
              <div className="border border-outline-variant rounded-xl p-lg bg-surface-container-lowest space-y-3">
                <h4 className="font-bold text-on-surface border-b border-outline-variant pb-2 text-sm uppercase tracking-wider text-primary">Extracted Medicines</h4>
                <div className="divide-y divide-outline-variant">
                  {scannedMedicines.map((med) => (
                    <div key={med.id} className="py-3 flex justify-between items-center text-sm">
                      <div>
                        <span className="font-semibold text-on-surface">{med.name}</span>
                        <span className="block text-xs text-on-surface-variant mt-0.5">₹{med.price.toFixed(2)} each</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-primary">Qty: {med.quantity}</span>
                        <span className="block text-xs font-semibold text-outline mt-0.5">Total: ₹{(med.price * med.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Success Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/dashboard/cart"
                  className="flex-1 bg-primary text-on-primary font-bold py-3.5 rounded-xl hover:bg-on-primary-fixed-variant transition-all text-center flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Go to Cart</span>
                  <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                </Link>
                <button
                  onClick={resetScanner}
                  className="flex-1 bg-surface-container-low border border-outline-variant text-on-surface-variant font-bold py-3.5 rounded-xl hover:bg-surface-container-high transition-all text-center flex items-center justify-center gap-2"
                >
                  <span>Scan Another</span>
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      <BottomNav />
    </div>
  );
}
