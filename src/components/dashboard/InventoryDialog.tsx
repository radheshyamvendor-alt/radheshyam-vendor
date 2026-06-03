"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { MedicineInput } from "@/app/actions/medicine";

const medicineSchema = zod.object({
  name: zod.string().min(2, "Medicine name must be at least 2 characters"),
  category: zod.string().min(1, "Please select a category"),
  description: zod.string().optional(),
  price: zod.number().positive("Price must be a positive number"),
  stock: zod.number().int().nonnegative("Stock cannot be negative"),
  image: zod.string().optional(),
});

type MedicineFormValues = zod.infer<typeof medicineSchema>;

interface MedicineItem {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  price: number;
  stock: number;
  image?: string | null;
}

interface InventoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MedicineInput) => Promise<void>;
  medicine?: MedicineItem | null; // Selected medicine for editing
}

export default function InventoryDialog({
  isOpen,
  onClose,
  onSubmit,
  medicine,
}: InventoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      price: 0,
      stock: 0,
      image: "",
    },
  });

  // Prefill values if editing
  useEffect(() => {
    if (medicine) {
      reset({
        name: medicine.name,
        category: medicine.category,
        description: medicine.description || "",
        price: medicine.price,
        stock: medicine.stock,
        image: medicine.image || "",
      });
    } else {
      reset({
        name: "",
        category: "",
        description: "",
        price: 0,
        stock: 0,
        image: "",
      });
    }
  }, [medicine, reset, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (values: MedicineFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        name: values.name,
        category: values.category,
        description: values.description || undefined,
        price: values.price,
        stock: values.stock,
        image: values.image || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save medicine details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    "Tablets",
    "Capsules",
    "Syrups",
    "Injections",
    "Drops",
    "Ointments",
    "Medical Devices",
    "Other",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/40 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-surface border border-outline-variant rounded-2xl shadow-xl overflow-hidden glass-card animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <h3 className="font-bold text-headline-sm text-on-surface">
            {medicine ? "Edit Medicine" : "Add New Medicine"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-90 transition-transform"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-error-container/30 border border-error text-error text-sm rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Medicine Name */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="name">
              Medicine Name *
            </label>
            <input
              {...register("name")}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60 text-on-surface"
              id="name"
              placeholder="e.g. Paracetamol 650mg"
              type="text"
            />
            {errors.name && <p className="text-xs text-error ml-1">{errors.name.message}</p>}
          </div>

          {/* Category Select */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="category">
              Category *
            </label>
            <select
              {...register("category")}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md text-on-surface"
              id="category"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-error ml-1">{errors.category.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Price */}
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="price">
                Unit Price (₹) *
              </label>
              <input
                {...register("price", { valueAsNumber: true })}
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md text-on-surface"
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
              {errors.price && <p className="text-xs text-error ml-1">{errors.price.message}</p>}
            </div>

            {/* Stock Quantity */}
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="stock">
                Stock Quantity *
              </label>
              <input
                {...register("stock", { valueAsNumber: true })}
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md text-on-surface"
                id="stock"
                type="number"
                placeholder="0"
              />
              {errors.stock && <p className="text-xs text-error ml-1">{errors.stock.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="description">
              Description
            </label>
            <textarea
              {...register("description")}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60 text-on-surface min-h-[80px]"
              id="description"
              placeholder="e.g. Prescribed for pain relief and fever reduction..."
            />
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="image">
              Image URL (Optional)
            </label>
            <input
              {...register("image")}
              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-body-md text-body-md placeholder:text-outline/60 text-on-surface"
              id="image"
              placeholder="https://example.com/medicine.png"
              type="text"
            />
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
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-md hover:bg-on-primary-fixed-variant active:scale-[0.98] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{medicine ? "Save Changes" : "Add Medicine"}</span>
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
