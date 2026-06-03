"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { useCart } from "@/providers/CartProvider";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";

export default function CartPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const { cart, totalPrice, totalItems, updateQuantity, removeFromCart, addMultipleToCart } = useCart();

  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  // Pending OCR result — user must confirm before adding to cart
  const [pendingOcr, setPendingOcr] = useState<{
    prescriptionNumber: string;
    patient: { name: string; mobile: string; address: string; gender: string; age: number };
    medicines: Array<{ id: string; name: string; price: number; quantity: number; stock: number }>;
  } | null>(null);
  const [isEditingOcr, setIsEditingOcr] = useState(false);

  const handleUpdateOcrMedQty = (medId: string, newQty: number) => {
    if (!pendingOcr) return;
    const updatedMeds = pendingOcr.medicines.map((med) =>
      med.id === medId ? { ...med, quantity: Math.max(1, newQty) } : med
    );
    setPendingOcr({ ...pendingOcr, medicines: updatedMeds });
  };

  const handleRemoveOcrMed = (medId: string) => {
    if (!pendingOcr) return;
    const updatedMeds = pendingOcr.medicines.filter((med) => med.id !== medId);
    setPendingOcr({ ...pendingOcr, medicines: updatedMeds });
  };

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
    setPendingOcr(null);
    setIsEditingOcr(false);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const resData = await response.json();
      if (resData.success) {
        // Do NOT add to cart yet — show review panel first
        setPendingOcr(resData.data);
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

  const handleConfirmOcr = () => {
    if (!pendingOcr) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "radheshyam_scanned_rx",
        JSON.stringify({
          prescriptionNumber: pendingOcr.prescriptionNumber,
          patient: pendingOcr.patient,
        })
      );
    }
    addMultipleToCart(pendingOcr.medicines);
    setPendingOcr(null);
    setIsEditingOcr(false);
  };

  const handleDiscardOcr = () => {
    setPendingOcr(null);
    setOcrError(null);
    setIsEditingOcr(false);
  };

  // Financial calculations
  const subtotal = totalPrice;
  const tax = subtotal * 0.08; // 8% estimated tax
  const totalAmount = subtotal + tax;

  const handleProceedToCheckout = () => {
    router.push("/dashboard/checkout");
  };

  return (
    <div className="min-h-screen bg-background trust-gradient pb-20 md:pb-12 text-on-background">
      {/* Shared Responsive Header */}
      <Header />

      <main className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        {totalItems === 0 ? (
          /* Empty State */
          <div className="max-w-xl mx-auto flex flex-col space-y-6">
            <div className="text-center py-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm glass-card flex flex-col items-center justify-center space-y-6">
              <div className="w-16 h-16 bg-primary-container/20 text-primary rounded-full flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[36px]">shopping_cart</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-on-surface">Your cart is currently empty</h2>
                <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                  Add medicines or medical equipment from the catalog to populate your cart and checkout.
                </p>
              </div>
              <Link 
                href="/dashboard/catalog" 
                className="px-6 py-3 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shadow-md inline-block font-bold"
              >
                Browse Medicine Catalog
              </Link>
            </div>
            
            <div className="flex items-center gap-4 my-2">
              <div className="h-[1px] bg-outline-variant flex-grow"></div>
              <span className="text-xs font-bold text-outline uppercase tracking-wider select-none">Or scan prescription</span>
              <div className="h-[1px] bg-outline-variant flex-grow"></div>
            </div>

            {/* OCR Dropzone or Review Panel */}
            {pendingOcr ? (
              /* Review extracted details before confirming */
              <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-2xl p-5 glass-card space-y-4">
                <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 text-amber-700 p-3 rounded-xl">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-[20px]">rate_review</span>
                    <div>
                      <span className="font-bold block">Review Extracted Details</span>
                      <span className="text-xs text-on-surface-variant">Verify before adding to cart.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingOcr(!isEditingOcr)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-bold bg-primary/10 px-2 py-1 rounded-lg transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px]">{isEditingOcr ? "check" : "edit"}</span>
                    <span>{isEditingOcr ? "Done" : "Edit"}</span>
                  </button>
                </div>

                {isEditingOcr ? (
                  <div className="space-y-3 text-sm border border-outline-variant rounded-xl p-3 bg-surface">
                    <div>
                      <label className="text-[10px] font-semibold text-outline block mb-0.5">Patient Name</label>
                      <input
                        type="text"
                        value={pendingOcr.patient.name}
                        onChange={(e) => setPendingOcr({
                          ...pendingOcr,
                          patient: { ...pendingOcr.patient, name: e.target.value }
                        })}
                        className="w-full px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-outline block mb-0.5">Rx Number</label>
                        <input
                          type="text"
                          value={pendingOcr.prescriptionNumber}
                          onChange={(e) => setPendingOcr({
                            ...pendingOcr,
                            prescriptionNumber: e.target.value
                          })}
                          className="w-full px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-outline block mb-0.5">Mobile</label>
                        <input
                          type="text"
                          value={pendingOcr.patient.mobile}
                          onChange={(e) => setPendingOcr({
                            ...pendingOcr,
                            patient: { ...pendingOcr.patient, mobile: e.target.value }
                          })}
                          className="w-full px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-outline block mb-0.5">Address</label>
                      <textarea
                        value={pendingOcr.patient.address}
                        onChange={(e) => setPendingOcr({
                          ...pendingOcr,
                          patient: { ...pendingOcr.patient, address: e.target.value }
                        })}
                        rows={2}
                        className="w-full px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm border border-outline-variant rounded-xl p-3 bg-surface">
                    <div>
                      <span className="text-xs text-outline block">Patient Name</span>
                      <span className="font-semibold text-on-surface">{pendingOcr.patient.name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-outline block">Rx Number</span>
                      <span className="font-semibold text-on-surface">{pendingOcr.prescriptionNumber}</span>
                    </div>
                    <div>
                      <span className="text-xs text-outline block">Mobile</span>
                      <span className="font-semibold text-on-surface">{pendingOcr.patient.mobile}</span>
                    </div>
                    <div>
                      <span className="text-xs text-outline block">Address</span>
                      <span className="font-semibold text-on-surface text-xs">{pendingOcr.patient.address}</span>
                    </div>
                  </div>
                )}

                <div className="border border-outline-variant rounded-xl p-3 bg-surface divide-y divide-outline-variant text-sm">
                  {pendingOcr.medicines.length === 0 ? (
                    <div className="py-2 text-center text-xs text-on-surface-variant font-semibold">
                      No medicines.
                    </div>
                  ) : (
                    pendingOcr.medicines.map((med) => (
                      <div key={med.id} className="py-2 flex justify-between items-center gap-2">
                        <span className="font-semibold text-on-surface text-xs sm:text-sm">{med.name}</span>
                        {isEditingOcr ? (
                          <div className="flex items-center gap-2">
                            {/* Quantity Editor */}
                            <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-surface">
                              <button
                                type="button"
                                onClick={() => handleUpdateOcrMedQty(med.id, med.quantity - 1)}
                                className="px-1.5 py-0.5 hover:bg-surface-container text-primary font-bold transition-all active:scale-75 text-xs"
                              >
                                <span className="material-symbols-outlined text-[14px]">remove</span>
                              </button>
                              <span className="px-2.5 py-0.5 font-bold text-on-surface text-[11px] select-none">
                                {med.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateOcrMedQty(med.id, med.quantity + 1)}
                                className="px-1.5 py-0.5 hover:bg-surface-container text-primary font-bold transition-all active:scale-75 text-xs"
                              >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                              </button>
                            </div>
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveOcrMed(med.id)}
                              className="text-error hover:bg-error-container/10 p-1.5 rounded-full transition-colors"
                              title="Delete medicine"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-primary font-bold text-xs">Qty: {med.quantity} · ₹{(med.price * med.quantity).toFixed(2)}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmOcr}
                    className="flex-1 bg-primary text-on-primary font-bold py-3 rounded-xl hover:bg-on-primary-fixed-variant transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Confirm &amp; Add
                  </button>
                  <button
                    onClick={handleDiscardOcr}
                    className="flex-1 border border-outline-variant bg-surface text-on-surface-variant hover:bg-error-container/10 hover:border-error/30 hover:text-error font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    Discard
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-2xl p-6 glass-card space-y-4">
                {ocrError && (
                  <div className="p-4 bg-error-container/20 border border-error/20 text-error rounded-xl flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{ocrError}</span>
                  </div>
                )}
                {isOcrProcessing ? (
                  <div className="h-44 border border-outline-variant rounded-xl bg-surface-container-low flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-85 shadow-[0_0_10px_#003d9b] animate-[bounce_2.5s_infinite_linear]"></div>
                    <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h4 className="mt-3 font-bold text-on-surface text-sm">Processing Prescription...</h4>
                    <p className="text-[10px] text-on-surface-variant mt-0.5 animate-pulse">Extracting patient &amp; medicine details...</p>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`h-44 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer transition-all ${
                      isDragOver
                        ? "border-primary bg-primary/5"
                        : "border-outline-variant hover:border-primary/50"
                    }`}
                    onClick={() => document.getElementById("file-input-empty")?.click()}
                  >
                    <input
                      id="file-input-empty"
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/jpg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-[36px] text-primary mb-2 animate-pulse">
                      document_scanner
                    </span>
                    <span className="font-bold text-on-surface text-sm">Scan Prescription to Fill Cart</span>
                    <span className="text-[10px] text-on-surface-variant mt-0.5">Supports PDF, PNG, JPG, JPEG</span>
                    <button
                      type="button"
                      className="mt-3 px-3 py-1.5 bg-surface border border-outline-variant rounded-lg font-label-sm text-label-sm text-on-surface hover:bg-surface-container transition-all"
                    >
                      Select File
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        ) : (
          /* Cart Content Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
            {/* Cart Items Section */}
            <div className="lg:col-span-8 space-y-md">
              {cart.map((item) => {
                const mockListPrice = item.price * 1.25; // Strike-through list price for aesthetic

                return (
                  <div 
                    key={item.id} 
                    className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg flex flex-col md:flex-row gap-lg cart-card-shadow hover:border-primary/30 transition-all duration-300"
                  >
                    {/* Item Image */}
                    <div className="w-24 h-24 bg-surface-container-low rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-outline-variant">
                      {item.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="material-symbols-outlined text-[48px] text-outline">medication</span>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-grow flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-headline-md text-headline-md text-on-surface">{item.name}</h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                            Category: {item.category} • Certified Batch
                          </p>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-error hover:bg-error-container/10 p-2 rounded-full transition-colors active:scale-90"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>

                      <div className="flex justify-between items-center mt-md">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-surface-container-low">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="px-3 py-1.5 hover:bg-surface-container-high text-primary font-bold transition-all active:scale-75"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">remove</span>
                          </button>
                          <span className="px-4 py-1.5 font-bold text-on-surface select-none">
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-3 py-1.5 hover:bg-surface-container-high text-primary font-bold transition-all active:scale-75"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </button>
                        </div>

                        {/* Price Breakdown */}
                        <div className="text-right">
                          <span className="block font-label-sm text-label-sm text-on-surface-variant line-through">
                            ₹{(mockListPrice * item.quantity).toFixed(2)}
                          </span>
                          <span className="font-headline-md text-headline-md text-primary font-bold">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                {/* Add more items card trigger */}
                <Link
                  href="/dashboard/catalog"
                  className="border border-outline-variant rounded-xl p-lg flex flex-col items-center justify-center text-center group hover:border-primary hover:bg-primary/5 transition-all duration-300 bg-surface-container-lowest"
                >
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors mb-sm">
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  </div>
                  <h4 className="font-headline-sm text-body-lg font-bold text-on-surface">Add more medicines</h4>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">Need to add another prescription or OTC item?</p>
                </Link>

                {/* Upload Prescription OCR Card */}
                <div className="border border-outline-variant rounded-xl p-lg flex flex-col justify-center bg-surface-container-lowest hover:border-primary/50 transition-all duration-300">
                  {ocrError && (
                    <div className="mb-2 p-2 bg-error-container/20 border border-error/20 text-error rounded-lg flex items-center gap-2 text-xs">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      <span>{ocrError}</span>
                    </div>
                  )}
                  {isOcrProcessing ? (
                    <div className="h-28 border border-outline-variant rounded-lg bg-surface-container-low flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-85 shadow-[0_0_10px_#003d9b] animate-[bounce_2.5s_infinite_linear]"></div>
                      <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="mt-2 text-xs font-semibold text-on-surface">Scanning Prescription...</span>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`h-28 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-3 cursor-pointer transition-all ${
                        isDragOver ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary"
                      }`}
                      onClick={() => document.getElementById("file-input-cart")?.click()}
                    >
                      <input
                        id="file-input-cart"
                        type="file"
                        accept="application/pdf,image/png,image/jpeg,image/jpg"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <span className="material-symbols-outlined text-[24px] text-primary mb-1 animate-pulse">
                        document_scanner
                      </span>
                      <span className="font-bold text-on-surface text-xs text-center">Scan prescription to add medicines</span>
                      <span className="text-[9px] text-on-surface-variant mt-0.5">PDF, PNG, JPG, JPEG</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="lg:col-span-4 space-y-lg">
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-xl cart-card-shadow sticky top-28 glass-card">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-lg">Order Summary</h2>
                <div className="space-y-md mb-xl">
                  <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                    <span>Estimated Tax (8%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                    <span>Shipping</span>
                    <span className="text-primary font-bold uppercase tracking-wider text-xs">Free</span>
                  </div>
                  <div className="h-[1px] bg-outline-variant w-full my-md"></div>
                  <div className="flex justify-between items-center">
                    <span className="font-headline-md text-headline-md text-on-surface">Total Amount</span>
                    <span className="font-headline-lg text-headline-lg text-primary font-bold">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-md">
                  <div className="bg-primary-container/10 p-md rounded-lg flex items-start gap-md border border-primary/20">
                    <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      info
                    </span>
                    <p className="font-label-sm text-label-sm text-primary">
                      Prescription medicines require validation in the next step.
                    </p>
                  </div>
                  <button 
                    onClick={handleProceedToCheckout}
                    className="w-full bg-primary text-on-primary font-headline-md text-headline-md py-4 rounded-xl hover:bg-on-primary-fixed-variant active:scale-[0.98] transition-all flex items-center justify-center gap-md shadow-md"
                  >
                    <span>Proceed to Prescription</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                  <Link 
                    href="/dashboard/catalog"
                    className="w-full bg-surface-container-low text-on-surface-variant font-label-md text-label-md py-3 rounded-xl hover:bg-surface-container-high transition-colors block text-center border border-outline-variant"
                  >
                    Continue Shopping
                  </Link>
                </div>

                <div className="mt-xl flex gap-md justify-center items-center opacity-65 text-xs text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>Secure 256-bit SSL encrypted checkout</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Shared Responsive Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
