"use client";

import { useEffect, useState } from "react";
import { UpdateOrderInput } from "@/app/actions/order";

interface EditOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderId: string, input: UpdateOrderInput) => Promise<void>;
  order?: {
    id: string;
    prescriptionNumber: string | null;
    status: string;
    patient: {
      name: string;
      mobile: string;
      address: string;
    } | null;
    orderMedicines: Array<{
      medicineId: string;
      quantity: number;
      medicine: {
        name: string;
      };
    }>;
  } | null;
}

export default function EditOrderDialog({
  isOpen,
  onClose,
  onSubmit,
  order,
}: EditOrderDialogProps) {
  const [prescriptionNo, setPrescriptionNo] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientMobile, setPatientMobile] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [items, setItems] = useState<Array<{ medicineId: string; name: string; quantity: number }>>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setPrescriptionNo(order.prescriptionNumber || "");
      setPatientName(order.patient?.name || "");
      setPatientMobile(order.patient?.mobile || "");
      setPatientAddress(order.patient?.address || "");
      setItems(
        order.orderMedicines.map((m) => ({
          medicineId: m.medicineId,
          name: m.medicine.name,
          quantity: m.quantity,
        }))
      );
      setErrorMsg(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleQtyChange = (medicineId: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.medicineId === medicineId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (medicineId: string) => {
    setItems((prev) => prev.filter((item) => item.medicineId !== medicineId));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    if (!prescriptionNo.trim()) {
      setErrorMsg("Prescription number is required.");
      setIsSubmitting(false);
      return;
    }

    if (!patientName.trim()) {
      setErrorMsg("Patient name is required.");
      setIsSubmitting(false);
      return;
    }

    if (patientMobile.length !== 10) {
      setErrorMsg("Patient mobile must be exactly 10 digits.");
      setIsSubmitting(false);
      return;
    }

    if (!patientAddress.trim()) {
      setErrorMsg("Patient address is required.");
      setIsSubmitting(false);
      return;
    }

    if (items.length === 0) {
      setErrorMsg("Order must contain at least one medicine item.");
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(order.id, {
        prescriptionNumber: prescriptionNo,
        patient: {
          name: patientName,
          mobile: patientMobile,
          address: patientAddress,
        },
        items: items.map((i) => ({
          medicineId: i.medicineId,
          quantity: i.quantity,
        })),
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update order details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/40 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-surface border border-outline-variant rounded-2xl shadow-xl overflow-hidden glass-card animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <h3 className="font-bold text-headline-sm text-on-surface">Edit Order Details</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-90 transition-transform"
            type="button"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Prescription Number */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="prescriptionNo">
              Prescription Number *
            </label>
            <input
              id="prescriptionNo"
              value={prescriptionNo}
              onChange={(e) => setPrescriptionNo(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60 text-on-surface"
              placeholder="e.g. RX12345"
              type="text"
              required
            />
          </div>

          {/* Patient Name */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="patientName">
              Patient Name *
            </label>
            <input
              id="patientName"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60 text-on-surface"
              placeholder="e.g. John Doe"
              type="text"
              required
            />
          </div>

          {/* Patient Mobile */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="patientMobile">
              Patient Mobile *
            </label>
            <input
              id="patientMobile"
              value={patientMobile}
              onChange={(e) => setPatientMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60 text-on-surface"
              placeholder="10-digit mobile number"
              type="tel"
              required
            />
          </div>

          {/* Patient Address */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="patientAddress">
              Patient Address *
            </label>
            <textarea
              id="patientAddress"
              value={patientAddress}
              onChange={(e) => setPatientAddress(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60 text-on-surface min-h-[60px]"
              placeholder="Delivery address details"
              required
            />
          </div>

          {/* Ordered Items List */}
          <div className="space-y-2 pt-2">
            <span className="font-label-md text-label-md text-on-surface-variant ml-1 block">
              Medicines in Order *
            </span>
            <div className="space-y-2 bg-surface-container-low p-3 rounded-xl border border-outline-variant">
              {items.map((item) => (
                <div key={item.medicineId} className="flex items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0 border-b last:border-b-0 border-outline-variant">
                  <span className="font-body-md text-body-md text-on-surface font-semibold truncate flex-1">
                    {item.name}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-outline rounded-lg bg-surface overflow-hidden h-8">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.medicineId, -1)}
                        disabled={item.quantity <= 1}
                        className="px-2 h-full text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors disabled:opacity-40"
                      >
                        -
                      </button>
                      <span className="px-2.5 text-xs font-bold text-primary font-mono min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.medicineId, 1)}
                        className="px-2 h-full text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.medicineId)}
                      className="p-1 rounded text-error hover:bg-error/10 transition-colors"
                      title="Remove medicine"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-outline-variant mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-surface border border-outline-variant text-on-surface-variant rounded-xl font-label-md text-label-md hover:bg-surface-container active:scale-95 transition-all"
              type="button"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-md hover:bg-on-primary-fixed-variant active:scale-[0.98] transition-all disabled:opacity-75"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
