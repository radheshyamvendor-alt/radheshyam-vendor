"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useAuth from "@/hooks/useAuth";
import { useCart } from "@/providers/CartProvider";
import { createOrder, CreateOrderInput } from "@/app/actions/order";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";

export interface CheckoutItem {
  medicineId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

export interface CreatedOrder {
  id: string;
  prescriptionNumber: string | null;
  status: string;
}

export default function Checkout() {
  const { logout, user } = useAuth();
  const { cart, clearCart } = useCart();
  const queryClient = useQueryClient();

  // Wizard Step
  const [step, setStep] = useState(2); // Start directly on Review Details
  const [isInitialized, setIsInitialized] = useState(false);

  // Load initial cart items and scanned prescription details on mount
  useEffect(() => {
    if (isInitialized) return;
    
    if (cart && cart.length > 0) {
      setOrderItems(
        cart.map((item) => ({
          medicineId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          stock: item.stock,
        }))
      );
      setStep(2); // Default to review step
      setIsInitialized(true);
    }
    
    const savedRx = localStorage.getItem("radheshyam_scanned_rx");
    if (savedRx) {
      try {
        const parsed = JSON.parse(savedRx);
        if (parsed.prescriptionNumber) setPrescriptionNumber(parsed.prescriptionNumber);
        if (parsed.patient) {
          if (parsed.patient.name) setPatientName(parsed.patient.name);
          if (parsed.patient.mobile) setPatientMobile(parsed.patient.mobile);
          if (parsed.patient.address) setPatientAddress(parsed.patient.address);
          if (parsed.patient.gender) setPatientGender(parsed.patient.gender);
          if (parsed.patient.age) setPatientAge(Number(parsed.patient.age));
        }
      } catch (e) {
        console.error("Failed to parse scanned Rx details from localStorage", e);
      }
    }
  }, [cart, isInitialized]);

  // File Upload states
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Extracted Data Form States
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientMobile, setPatientMobile] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [patientGender, setPatientGender] = useState("Male");
  const [patientAge, setPatientAge] = useState(30);
  const [orderItems, setOrderItems] = useState<CheckoutItem[]>([]); // Extracted medicines

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  // Create Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: (result) => {
      if (result.success) {
        setCreatedOrder(result.data as CreatedOrder);
        clearCart();
        queryClient.invalidateQueries({ queryKey: ["medicines"] });
        queryClient.invalidateQueries({ queryKey: ["catalog-medicines"] });
        setStep(3); // Success step
      } else {
        setErrorMsg(result.error || "Failed to create order.");
      }
    },
  });

  // Handle drag and drop events
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

  // Upload file and call OCR api route
  const processFileOcr = async (selectedFile: File) => {
    // Validate file type
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(selectedFile.type)) {
      setErrorMsg("Invalid file type. Please upload a PDF, PNG, JPG, or JPEG file.");
      return;
    }

    setIsOcrProcessing(true);
    setErrorMsg(null);

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
        setPatientName(ocrData.patient.name);
        setPatientMobile(ocrData.patient.mobile);
        setPatientAddress(ocrData.patient.address);
        setPatientGender(ocrData.patient.gender);
        setPatientAge(ocrData.patient.age);

        // Merge cart items with extracted medicines to ensure stock/price is correct
        interface ExtractedMed {
          id: string;
          name: string;
          price: number;
          quantity: number;
          stock: number;
        }
        const items = ocrData.medicines.map((m: ExtractedMed) => ({
          medicineId: m.id,
          name: m.name,
          price: m.price,
          quantity: m.quantity,
          stock: m.stock,
        }));
        
        // If there are cart items, append them as well
        const cartItems = cart.map(item => ({
          medicineId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          stock: item.stock,
        }));

        // Merge arrays (remove duplicates based on medicineId)
        const mergedItems = [...items];
        cartItems.forEach(cartItem => {
          if (!mergedItems.some(item => item.medicineId === cartItem.medicineId)) {
            mergedItems.push(cartItem);
          }
        });

        setOrderItems(mergedItems);
        setStep(2); // Move to review step
      } else {
        setErrorMsg(resData.error || "OCR extraction failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Failed to communicate with OCR service.";
      setErrorMsg(errMsg);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleUpdateItemQuantity = (id: string, qty: number) => {
    setOrderItems((prevItems) =>
      prevItems.map((item) => {
        if (item.medicineId === id) {
          const newQty = Math.max(1, Math.min(qty, item.stock));
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setOrderItems((prevItems) => prevItems.filter((item) => item.medicineId !== id));
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (orderItems.length === 0) {
      setErrorMsg("Please add at least one medicine to the order.");
      return;
    }

    if (!prescriptionNumber || !patientName || !patientMobile || !patientAddress) {
      setErrorMsg("Please complete all patient information fields.");
      return;
    }

    const payload: CreateOrderInput = {
      prescriptionNumber,
      patient: {
        prescriptionNumber,
        name: patientName,
        mobile: patientMobile,
        address: patientAddress,
        gender: patientGender,
        age: Number(patientAge),
      },
      items: orderItems.map((i) => ({
        medicineId: i.medicineId,
        quantity: i.quantity,
      })),
      chemistEmail: user?.email || undefined,
    };

    createOrderMutation.mutate(payload);
  };

  const checkoutTotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-background trust-gradient pb-24 md:pb-12">
      {/* Shared Responsive Header */}
      <Header />

      {/* Wizard content */}
      <main className="max-w-[650px] mx-auto space-y-6 px-4 sm:px-6 md:px-0">
        {step !== 3 && (
          <div className="flex items-center pt-2">
            <Link
              href="/dashboard/cart"
              className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-semibold group"
            >
              <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-0.5 transition-transform">
                arrow_back
              </span>
              <span>Back to Cart</span>
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD & PROCESS OCR */}
        {step === 1 && (
          <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-8 glass-card space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-headline-sm font-bold text-on-surface">Prescription OCR Verification</h3>
              <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                Upload a prescription document (PDF or image). Our OCR engine will automatically extract the Patient profile and Medicine items.
              </p>
            </div>

            {isOcrProcessing ? (
              // Scanning Animation Loader
              <div className="h-64 border border-outline-variant rounded-2xl bg-surface-container-lowest flex flex-col items-center justify-center relative overflow-hidden">
                {/* Simulated Laser Scan Line */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-85 shadow-[0_0_10px_#003d9b] animate-[bounce_2.5s_infinite_linear]"></div>
                
                <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h4 className="mt-4 font-bold text-on-surface text-base">Radheshyam OCR Active</h4>
                <p className="text-xs text-on-surface-variant mt-1 animate-pulse">Scanning file database &amp; structures...</p>
              </div>
            ) : (
              // Drag & Drop Area
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary/50"
                }`}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
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
                  Browse File
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: REVIEW EXTRACTED DETAILS */}
        {step === 2 && (
          <form onSubmit={handleCheckoutSubmit} className="space-y-6">
            {/* Patient Info Fields */}
            <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card space-y-4">
              <h3 className="font-bold text-headline-sm text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
                <span className="material-symbols-outlined text-primary">patient_list</span>
                <span>Review Patient Information</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Prescription Number */}
                <div className="space-y-1">
                  <label className="text-xs text-on-surface-variant font-semibold ml-1">Prescription Number *</label>
                  <input
                    value={prescriptionNumber}
                    onChange={(e) => setPrescriptionNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary outline-none transition-all text-sm text-on-surface font-medium"
                    type="text"
                    required
                  />
                </div>

                {/* Patient Name */}
                <div className="space-y-1">
                  <label className="text-xs text-on-surface-variant font-semibold ml-1">Patient Name *</label>
                  <input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary outline-none transition-all text-sm text-on-surface font-semibold"
                    type="text"
                    required
                  />
                </div>

                {/* Mobile Number */}
                <div className="space-y-1">
                  <label className="text-xs text-on-surface-variant font-semibold ml-1">Mobile Number *</label>
                  <input
                    value={patientMobile}
                    onChange={(e) => setPatientMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary outline-none transition-all text-sm text-on-surface font-medium"
                    type="text"
                    required
                  />
                </div>



                {/* Patient Address */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-on-surface-variant font-semibold ml-1">Patient Address *</label>
                  <textarea
                    value={patientAddress}
                    onChange={(e) => setPatientAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary outline-none transition-all text-sm text-on-surface min-h-[70px]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Medicines List review */}
            <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card space-y-4">
              <h3 className="font-bold text-headline-sm text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
                <span className="material-symbols-outlined text-primary">medication</span>
                <span>Review Prescribed Medicines</span>
              </h3>

              <div className="divide-y divide-outline-variant">
                {orderItems.map((item) => (
                  <div key={item.medicineId} className="py-3 flex items-center justify-between text-sm">
                    <div className="flex-grow pr-4">
                      <span className="font-semibold text-on-surface block">{item.name}</span>
                      <span className="text-on-surface-variant text-xs">₹{item.price.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity Modifier */}
                      <div className="flex items-center border border-outline-variant bg-surface-container-lowest rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(item.medicineId, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-90 transition-transform"
                        >
                          -
                        </button>
                        <span className="w-10 text-center font-bold text-on-surface select-none">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(item.medicineId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-90 transition-transform"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.medicineId)}
                        className="w-8 h-8 flex items-center justify-center text-error hover:bg-error-container/10 rounded-full active:scale-90 transition-transform"
                        title="Remove medicine"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Calculation */}
              <div className="pt-4 border-t border-outline-variant flex items-center justify-between font-bold text-base text-on-surface">
                <span>Calculated Total</span>
                <span className="text-primary text-lg">₹{checkoutTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Actions */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={createOrderMutation.isPending}
                className="w-full h-14 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-lg hover:bg-on-primary-fixed-variant active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {createOrderMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating Order...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Place Order</span>
                    <span className="material-symbols-outlined">assignment_turned_in</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: ORDER CREATED SUCCESS SCREEN */}
        {step === 3 && createdOrder && (
          <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-8 glass-card space-y-6 text-center">
            <div className="w-16 h-16 bg-tertiary-container/10 border border-tertiary text-tertiary rounded-full flex items-center justify-center mx-auto mb-4 scale-110">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-headline-md font-bold text-on-surface">Order Placed Successfully!</h3>
              <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                Prescription order has been validated and saved in the database. Stock inventory has been adjusted.
              </p>
            </div>

            {/* Order info details box */}
            <div className="bg-surface-container rounded-xl p-4 text-left space-y-2 border border-outline-variant max-w-md mx-auto text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Order ID:</span>
                <span className="font-semibold text-on-surface">{createdOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Prescription No:</span>
                <span className="font-semibold text-on-surface">{createdOrder.prescriptionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Order Status:</span>
                <span className="font-bold text-primary uppercase">{createdOrder.status}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3.5 bg-surface border border-outline-variant text-on-surface rounded-xl font-label-md text-label-md hover:bg-surface-container transition-all"
              >
                Back to Dashboard
              </Link>
              
              <Link
                href="/dashboard/catalog"
                className="w-full sm:w-auto px-6 py-3.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-on-primary-fixed-variant transition-all shadow-md"
              >
                Browse Catalog
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Shared Responsive Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
