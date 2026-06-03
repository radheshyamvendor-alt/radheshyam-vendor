"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAuth from "@/hooks/useAuth";
import { getMedicines, addMedicine, updateMedicine, deleteMedicine, MedicineInput } from "@/app/actions/medicine";
import InventoryDialog from "@/components/dashboard/InventoryDialog";

export default function Inventory() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any | null>(null);

  // Fetch medicines query
  const { data: queryResult, isLoading, error } = useQuery({
    queryKey: ["medicines", search, category],
    queryFn: () => getMedicines(search, category),
  });

  const medicines = queryResult?.success ? (queryResult.data ?? []) : [];

  // Mutations
  const addMutation = useMutation({
    mutationFn: (newMed: MedicineInput) => addMedicine(newMed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MedicineInput }) => updateMedicine(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedicine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
    },
  });

  const handleOpenAddDialog = () => {
    setEditingMedicine(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (med: any) => {
    setEditingMedicine(med);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this medicine?")) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFormSubmit = async (input: MedicineInput) => {
    if (editingMedicine) {
      await updateMutation.mutateAsync({ id: editingMedicine.id, input });
    } else {
      await addMutation.mutateAsync(input);
    }
  };

  const categories = [
    "All",
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
    <div className="min-h-screen bg-background trust-gradient p-6">
      {/* Navigation Header */}
      <nav className="max-w-[960px] mx-auto bg-surface border border-outline-variant shadow-sm rounded-xl p-4 flex items-center justify-between mb-8 glass-card">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="bg-primary rounded-lg p-2 text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">medical_services</span>
            </div>
            <div>
              <span className="font-bold text-on-surface block text-sm sm:text-base">Radheshyam Medical</span>
              <span className="text-[10px] sm:text-xs text-accent-cyan uppercase tracking-wider font-semibold">Chemist Panel</span>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-all">
            Dashboard
          </Link>
          <Link href="/dashboard/catalog" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-all">
            Catalog
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-error-container/20 border border-error/30 hover:bg-error-container/40 text-error text-xs font-semibold rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Section */}
      <main className="max-w-[960px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card">
          <div>
            <h2 className="text-headline-md font-bold text-on-surface">Inventory Management</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Add, edit, or remove medicines and review active stock indicators.
            </p>
          </div>
          <button
            onClick={handleOpenAddDialog}
            className="h-12 px-6 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Add Medicine</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between glass-card">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicines..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm text-on-surface"
              type="text"
            />
          </div>

          {/* Category Filter selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs text-on-surface-variant font-semibold select-none hidden md:block" htmlFor="cat-filter">
              Category:
            </label>
            <select
              id="cat-filter"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm text-on-surface font-medium"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-surface border border-outline-variant shadow-sm rounded-xl overflow-hidden glass-card">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="mt-4 text-on-surface-variant text-sm font-semibold">Loading inventory data...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-error font-medium">
              Failed to load medicines: {(error as any).message || "Unknown Database connection error"}
            </div>
          ) : medicines.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant font-medium">
              No medicines found matching the query filters. Click "Add Medicine" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-on-surface">
                <thead className="bg-surface-container-lowest text-xs uppercase text-on-surface-variant font-bold border-b border-outline-variant select-none">
                  <tr>
                    <th className="px-6 py-4">Image</th>
                    <th className="px-6 py-4">Medicine Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">Price</th>
                    <th className="px-6 py-4 text-center">Stock Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {medicines.map((med: any) => {
                    // Stock warnings calculation
                    let stockBadge = (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-tertiary/10 border border-tertiary-container/30 text-tertiary-container">
                        In Stock ({med.stock})
                      </span>
                    );
                    if (med.stock === 0) {
                      stockBadge = (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-error-container/30 border border-error text-error">
                          Out of Stock
                        </span>
                      );
                    } else if (med.stock < 10) {
                      stockBadge = (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600">
                          Low Stock ({med.stock})
                        </span>
                      );
                    }

                    return (
                      <tr key={med.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-6 py-4">
                          <div className="w-12 h-12 rounded-lg bg-surface-container border border-outline-variant overflow-hidden flex items-center justify-center text-outline">
                            {med.image ? (
                              <img src={med.image} alt={med.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-[20px]">medication</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-on-surface">
                          <div>
                            <span className="block">{med.name}</span>
                            {med.description && (
                              <span className="block text-xs font-normal text-on-surface-variant truncate max-w-[200px]">
                                {med.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-on-surface-variant">{med.category}</td>
                        <td className="px-6 py-4 text-right font-semibold text-on-surface">
                          ₹{med.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">{stockBadge}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditDialog(med)}
                              className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-outline-variant text-primary hover:bg-surface-container active:scale-95 transition-all"
                              title="Edit medicine"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(med.id)}
                              className="w-9 h-9 flex items-center justify-center rounded-lg bg-error-container/10 border border-error/20 text-error hover:bg-error-container/20 active:scale-95 transition-all"
                              title="Delete medicine"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      <InventoryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleFormSubmit}
        medicine={editingMedicine}
      />
    </div>
  );
}
