"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAuth from "@/hooks/useAuth";
import { getMedicines, addMedicine, updateMedicine, deleteMedicine, MedicineInput, getInventoryStats } from "@/app/actions/medicine";
import InventoryDialog from "@/components/dashboard/InventoryDialog";
import ConfirmationDialog from "@/components/dashboard/ConfirmationDialog";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";

export interface MedicineItem {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  price: number;
  stock: number;
  image?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export default function Dashboard() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("All");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);
  const [animateBars, setAnimateBars] = useState(false);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineItem | null>(null);

  // Delete confirmation modal states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [medicineIdToDelete, setMedicineIdToDelete] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Trigger bar animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateBars(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category]);

  // Fetch medicines query (server-side paginated)
  const { data: queryResult, isLoading, error } = useQuery({
    queryKey: ["medicines", debouncedSearch, category, page],
    queryFn: () => getMedicines(debouncedSearch, category, page, pageSize),
  });

  // Fetch stats separately to keep pagination fast
  const { data: statsResult } = useQuery({
    queryKey: ["inventory-stats"],
    queryFn: () => getInventoryStats(),
  });

  const medicines = (queryResult?.success ? (queryResult.data ?? []) : []) as MedicineItem[];
  const paginatedMedicines = medicines;
  const totalPages = queryResult?.success ? (queryResult.pagination?.totalPages ?? 1) : 1;
  const totalCount = queryResult?.success ? (queryResult.pagination?.totalCount ?? 0) : 0;

  const inventoryStats = statsResult?.success ? statsResult.data : null;

  // Bento Stats calculation from server aggregates
  const totalStock = inventoryStats?.totalStock ?? 0;
  const lowStockCount = inventoryStats?.lowStockCount ?? 0;
  const expiringSoonCount = inventoryStats?.expiringSoonCount ?? 0;
  const activeCategoriesCount = inventoryStats?.activeCategoriesCount ?? 0;

  // Category health calculation for donut chart
  const tabletsStock = inventoryStats?.tabletsStock ?? 0;
  const capsulesStock = inventoryStats?.capsulesStock ?? 0;
  const syrupsStock = inventoryStats?.syrupsStock ?? 0;
  const otherStock = inventoryStats?.otherStock ?? 0;
  const totalStockVal = tabletsStock + capsulesStock + syrupsStock + otherStock || 1;

  // Circle circumference is 2 * PI * r = 2 * 3.14159 * 40 = 251.2
  const circ = 251.2;
  const tabletsLen = (tabletsStock / totalStockVal) * circ;
  const capsulesLen = (capsulesStock / totalStockVal) * circ;
  const syrupsLen = (syrupsStock / totalStockVal) * circ;
  const otherLen = (otherStock / totalStockVal) * circ;

  // Bar chart heights for category health (mobile)
  const categoryBars = [
    { label: "Tablets", stock: tabletsStock, color: "bg-[#003d9b]" },
    { label: "Capsules", stock: capsulesStock, color: "bg-[#505f76]" },
    { label: "Syrups", stock: syrupsStock, color: "bg-[#3b4358]" },
    { label: "Other", stock: otherStock, color: "bg-[#e0e3e5]" },
  ];
  const maxCatStock = Math.max(...categoryBars.map(c => c.stock), 1);

  // Live dynamic activity logs from server
  const recentLogs = (inventoryStats?.recentUpdates ?? []).map((med: any) => {
    const timeDiff = Math.abs(new Date().getTime() - new Date(med.updatedAt).getTime());
    const diffMins = Math.floor(timeDiff / (1000 * 60));
    let timeText = "Just now";
    if (diffMins > 0 && diffMins < 60) timeText = `${diffMins}m ago`;
    else if (diffMins >= 60 && diffMins < 1440) timeText = `${Math.floor(diffMins / 60)}h ago`;
    else if (diffMins >= 1440) timeText = `${Math.floor(diffMins / 1440)}d ago`;

    if (med.stock < 10) {
      return { type: "alert", title: `Alert: ${med.name}`, description: `Stock level below threshold (${med.stock} units left)`, time: timeText };
    }
    return { type: "restock", title: `Restock: ${med.name}`, description: `Stock level updated to ${med.stock} units`, time: timeText };
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: (newMed: MedicineInput) => addMedicine(newMed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-medicines"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MedicineInput }) => updateMedicine(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-medicines"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedicine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-medicines"] });
    },
  });

  const handleOpenAddDialog = () => { setEditingMedicine(null); setIsDialogOpen(true); };
  const handleOpenEditDialog = (med: MedicineItem) => { setEditingMedicine(med); setIsDialogOpen(true); };

  const handleDelete = (id: string) => {
    setMedicineIdToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleFormSubmit = async (input: MedicineInput) => {
    if (editingMedicine) {
      await updateMutation.mutateAsync({ id: editingMedicine.id, input });
    } else {
      await addMutation.mutateAsync(input);
    }
  };

  const handleExportCSV = () => {
    if (medicines.length === 0) return;
    const headers = ["ID", "Name", "Category", "Description", "Price", "Stock", "Updated At"];
    const rows = medicines.map((m: MedicineItem) => [
      m.id, `"${m.name.replace(/"/g, '""')}"`, m.category,
      `"${(m.description || "").replace(/"/g, '""')}"`, m.price, m.stock,
      new Date(m.updatedAt).toISOString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `radheshyam_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMockExpiry = (id: string, name: string) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const charSum = id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) + name.charCodeAt(0);
    return `${months[charSum % 12]} ${2026 + (charSum % 2)}`;
  };

  const categories = ["All", "Tablets", "Capsules", "Syrups", "Injections", "Drops", "Ointments", "Medical Devices", "Other"];

  return (
    <div className="min-h-screen bg-background text-on-surface relative">
      {/* Subtle dotted background - mobile only */}
      <div className="md:hidden fixed inset-0 -z-10 pointer-events-none opacity-40">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #c3c6d6 1px, transparent 0)", backgroundSize: "40px 40px" }}></div>
      </div>

      {/* Shared Responsive Header */}
      <Header
        rightActions={
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">search</span>
            </button>
            <button
              onClick={handleOpenAddDialog}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#003d9b] text-white shadow-lg active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        }
      />

      {/* ════════════════════════════════════════
          MOBILE LAYOUT
      ════════════════════════════════════════ */}
      <main className="md:hidden px-4 pt-6 space-y-8 pb-28">

        {/* Horizontal scrollable metric cards */}
        <section>
          <div className="flex overflow-x-auto gap-4 pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {/* Total Stock */}
            <div className="min-w-[240px] bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm snap-center flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="p-2 bg-primary-fixed rounded-lg text-on-primary-fixed">
                  <span className="material-symbols-outlined">inventory_2</span>
                </span>
                <span className="text-label-sm text-on-surface-variant">All items</span>
              </div>
              <div className="space-y-1">
                <p className="text-label-md text-on-surface-variant">Total Stock</p>
                <p className="text-headline-lg-mobile font-headline-lg-mobile text-[#003d9b]">
                  {isLoading ? "..." : totalStock.toLocaleString()}
                </p>
              </div>
            </div>
            {/* Low Stock */}
            <div className="min-w-[240px] bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm snap-center flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="p-2 bg-error-container rounded-lg text-on-error-container">
                  <span className="material-symbols-outlined">warning</span>
                </span>
                <span className="px-2 py-0.5 bg-error-container text-on-error-container rounded-full text-[10px] font-bold">CRITICAL</span>
              </div>
              <div className="space-y-1">
                <p className="text-label-md text-on-surface-variant">Low Stock Alerts</p>
                <p className="text-headline-lg-mobile font-headline-lg-mobile text-[#ba1a1a]">
                  {isLoading ? "..." : `${lowStockCount} Items`}
                </p>
              </div>
            </div>
            {/* Expiring */}
            <div className="min-w-[240px] bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm snap-center flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="p-2 bg-secondary-fixed rounded-lg text-on-secondary-fixed">
                  <span className="material-symbols-outlined">event_busy</span>
                </span>
                <span className="text-label-sm text-on-surface-variant">Next 30 days</span>
              </div>
              <div className="space-y-1">
                <p className="text-label-md text-on-surface-variant">Expiring Soon</p>
                <p className="text-headline-lg-mobile font-headline-lg-mobile text-secondary">
                  {isLoading ? "..." : `${expiringSoonCount} Units`}
                </p>
              </div>
            </div>
            {/* Categories */}
            <div className="min-w-[240px] bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm snap-center flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="p-2 bg-secondary-container rounded-lg text-on-secondary-container">
                  <span className="material-symbols-outlined">category</span>
                </span>
                <span className="text-label-sm text-on-surface-variant">Active</span>
              </div>
              <div className="space-y-1">
                <p className="text-label-md text-on-surface-variant">Categories</p>
                <p className="text-headline-lg-mobile font-headline-lg-mobile text-[#003d9b]">
                  {isLoading ? "..." : activeCategoriesCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Category Health Bar Chart */}
        <section className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
          <h2 className="font-headline-md text-headline-md mb-6">Category Health</h2>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-on-surface-variant text-sm">Loading...</div>
          ) : (
            <div className="flex items-end justify-between h-40 gap-2 mb-4">
              {categoryBars.map((bar) => {
                const heightPct = maxCatStock > 0 ? Math.round((bar.stock / maxCatStock) * 100) : 0;
                return (
                  <div key={bar.label} className="flex flex-col items-center flex-1 gap-2 h-full justify-end">
                    <div
                      className={`w-full ${bar.color} rounded-t-lg transition-all duration-1000`}
                      style={{ height: animateBars ? `${heightPct}%` : "0%", minHeight: heightPct > 0 ? "4px" : "0" }}
                    ></div>
                    <span className="text-[10px] font-bold text-on-surface-variant">{bar.label}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="pt-4 border-t border-outline-variant flex justify-between items-center">
            <p className="text-body-sm text-on-surface-variant">Active categories</p>
            <span className="font-bold text-[#003d9b]">{activeCategoriesCount}</span>
          </div>
        </section>

        {/* Mobile Stock Card List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md">Stock List</h2>
            <div className="flex items-center gap-2">
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="text-xs px-2 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface-variant outline-none"
              >
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          {/* Mobile search */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 h-11 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm outline-none focus:border-[#003d9b] transition-all text-on-surface"
              placeholder="Search medicines..."
              type="text"
            />
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-on-surface-variant text-sm font-semibold">Loading stock list...</span>
              </div>
            ) : medicines.length === 0 ? (
              <div className="py-10 text-center text-on-surface-variant font-medium text-sm">
                No medicines found. Tap + to add one.
              </div>
            ) : (
              paginatedMedicines.map((med: MedicineItem) => {
                const percent = Math.min(100, Math.round((med.stock / 500) * 100));
                const isLow = med.stock < 10;
                return (
                  <div key={med.id} className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm active:bg-surface-container transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 mr-3">
                        <h3 className="font-bold text-on-surface text-sm">{med.name}</h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${isLow ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container"}`}>
                          {med.category}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="font-bold text-[#003d9b] text-sm">₹{med.price.toFixed(2)}</p>
                        <div className="flex gap-1">
                          <button onClick={() => handleOpenEditDialog(med)} className="p-1.5 rounded-lg text-primary hover:bg-primary/10 active:scale-90 transition-transform">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(med.id)} className="p-1.5 rounded-lg text-error hover:bg-error/10 active:scale-90 transition-transform">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className={`text-[11px] font-bold ${isLow ? "text-error" : "text-on-surface-variant"}`}>
                          {isLow ? "Low Stock" : "Stock Level"}: {percent}%
                        </span>
                        <span className="text-[11px] font-bold text-on-surface">{med.stock} units</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${isLow ? "bg-error" : "bg-[#003d9b]"}`}
                          style={{ width: animateBars ? `${percent}%` : "0%" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-on-surface-variant">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-medium disabled:opacity-40">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 bg-[#003d9b] text-white rounded-lg text-xs font-medium disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </section>

        {/* Timeline Logs - Mobile */}
        <section className="space-y-4 pb-4">
          <h2 className="font-headline-md text-headline-md">Recent Logs</h2>
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-4">No recent activity logged.</p>
            ) : (
              <div className="space-y-6 relative">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-outline-variant"></div>
                {recentLogs.map((log, i) => (
                  <div key={i} className="relative pl-8">
                    <div className={`absolute left-0 top-1 w-5 h-5 rounded-full border-4 border-surface-container-lowest ${log.type === "alert" ? "bg-error-container" : "bg-primary-container"}`}></div>
                    <div className="space-y-0.5">
                      <p className="text-body-sm font-bold text-on-surface">{log.title}</p>
                      <p className="text-label-sm text-on-surface-variant">{log.description}</p>
                      <p className="text-[10px] text-outline">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ════════════════════════════════════════
          DESKTOP LAYOUT
      ════════════════════════════════════════ */}
      <main className="hidden md:block max-w-[1440px] mx-auto px-margin-desktop py-xl pb-12">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-2xl">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Inventory Dashboard</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Real-time health of your medical stock and supply chain.</p>
          </div>
          <div className="flex gap-sm">
            <button
              onClick={handleExportCSV}
              disabled={medicines.length === 0}
              className="flex items-center gap-xs px-lg h-12 rounded-xl bg-secondary-container text-on-secondary-container font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">file_download</span>
              Export CSV
            </button>
            <button
              onClick={handleOpenAddDialog}
              className="flex items-center gap-xs px-lg h-12 rounded-xl bg-[#003d9b] text-white font-label-md text-label-md hover:opacity-95 transition-opacity"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Add Medicine
            </button>
          </div>
        </div>

        {/* Bento Grid for Stats */}
        <div className="grid grid-cols-4 gap-lg mb-3xl">
          {/* Card 1: Total stock */}
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm flex flex-col justify-between glass-card">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-primary-container/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#003d9b]">inventory_2</span>
              </div>
              <span className="text-[#003d9b] font-label-sm text-label-sm px-2 py-1 rounded bg-primary-container/10 font-bold">+2.4%</span>
            </div>
            <div className="mt-md">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Total Stock Items</p>
              <h2 className="font-display-lg text-display-lg text-on-surface font-extrabold">{isLoading ? "..." : totalStock.toLocaleString()}</h2>
            </div>
          </div>
          
          {/* Card 2: Low Stock Alerts */}
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm flex flex-col justify-between border-l-4 border-l-error glass-card">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-error-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-error">warning</span>
              </div>
              <span className="text-error font-label-sm text-label-sm px-2 py-1 rounded bg-error-container/20 font-bold">Critical</span>
            </div>
            <div className="mt-md">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Low Stock Alerts</p>
              <h2 className="font-display-lg text-display-lg text-on-surface font-extrabold">{isLoading ? "..." : lowStockCount}</h2>
            </div>
          </div>

          {/* Card 3: Expiring Soon */}
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm flex flex-col justify-between glass-card">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-tertiary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary">event_busy</span>
              </div>
            </div>
            <div className="mt-md">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Expiring &lt; 30 Days</p>
              <h2 className="font-display-lg text-display-lg text-on-surface font-extrabold">{isLoading ? "..." : expiringSoonCount}</h2>
            </div>
          </div>

          {/* Card 4: Active Categories */}
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm flex flex-col justify-between glass-card">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">category</span>
              </div>
            </div>
            <div className="mt-md">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">Active Categories</p>
              <h2 className="font-display-lg text-display-lg text-on-surface font-extrabold">{isLoading ? "..." : activeCategoriesCount}</h2>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden glass-card">
          <div className="p-lg border-b border-outline-variant flex items-center justify-between gap-md">
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Inventory Stock List</h3>
            <div className="flex items-center gap-sm flex-1 max-w-md">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-body-md outline-none text-on-surface"
                  placeholder="Search by medicine name..."
                  type="text"
                />
              </div>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-medium text-on-surface-variant outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer h-11"
              >
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="mt-4 text-on-surface-variant text-sm font-semibold">Loading stock list...</span>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-error font-medium">
                Failed to load medicines: {(error as Error).message || "Database connection error"}
              </div>
            ) : medicines.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant font-medium">
                No medicines found. Click &quot;Add Medicine&quot; to register new medical supplies.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase font-semibold">Name</th>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase font-semibold">Category</th>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase font-semibold">Stock Level</th>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase font-semibold">Price</th>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase font-semibold">Expiry</th>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {paginatedMedicines.map((med: MedicineItem) => {
                    const percent = Math.min(100, Math.round((med.stock / 500) * 100));
                    const isLow = med.stock < 10;
                    const stockTextColor = isLow ? "text-error" : "text-on-surface";
                    const progressColor = isLow ? "bg-error" : "bg-[#003d9b]";
                    return (
                      <tr key={med.id} className="hover:bg-surface-container-low transition-colors cursor-pointer group">
                        <td className="px-lg py-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant overflow-hidden flex items-center justify-center text-outline shrink-0">
                              {med.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={med.image} alt={med.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-outlined text-[20px]">medication</span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-label-md text-label-md text-on-surface font-semibold">{med.name}</span>
                              <span className="text-body-sm text-label-sm text-outline truncate max-w-[200px]">
                                {med.description || "General Salt Formulation"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-lg py-lg">
                          <span className="px-3 py-1 bg-surface-container-high rounded-full font-label-sm text-label-sm text-on-surface-variant font-medium">{med.category}</span>
                        </td>
                        <td className="px-lg py-lg">
                          <div className="flex flex-col gap-1 w-32">
                            <div className={`flex justify-between text-label-sm font-label-sm ${stockTextColor} font-bold`}>
                              <span>{med.stock} Units</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-outline-variant rounded-full overflow-hidden">
                              <div className={`h-full ${progressColor}`} style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-lg py-lg font-label-md text-label-md text-on-surface font-semibold">₹{med.price.toFixed(2)}</td>
                        <td className="px-lg py-lg text-body-md text-on-surface-variant">{getMockExpiry(med.id, med.name)}</td>
                        <td className="px-lg py-lg">
                          <div className="flex justify-end gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEditDialog(med)} className="p-2 rounded-lg text-primary hover:bg-primary/10" title="Edit">
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                            <button onClick={() => handleDelete(med.id)} className="p-2 rounded-lg text-error hover:bg-error/10" title="Delete">
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="p-lg border-t border-outline-variant flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">
              Showing {totalCount > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, totalCount)} of {totalCount} medicines
            </span>
            <div className="flex gap-xs">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 border border-outline-variant rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-4 py-2 bg-[#003d9b] text-white rounded-lg text-label-md font-label-md hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold">
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Grid: Category Distribution & Recent Activity */}
        <div className="grid grid-cols-3 gap-lg mt-3xl">
          <div className="col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm glass-card">
            <div className="flex justify-between items-center mb-xl">
              <h4 className="font-headline-md text-headline-md text-on-surface font-bold">Stock Category Health</h4>
              <span className="material-symbols-outlined text-outline">more_horiz</span>
            </div>
            <div className="flex flex-row gap-xl justify-between items-center">
              <div className="flex flex-col gap-md">
                {[
                  { color: "bg-[#003d9b]", label: "Tablets", stock: tabletsStock },
                  { color: "bg-[#505f76]", label: "Capsules", stock: capsulesStock },
                  { color: "bg-[#3b4358]", label: "Syrups", stock: syrupsStock },
                  { color: "bg-[#e0e3e5]", label: "Other", stock: otherStock },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-sm">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">{item.label} ({item.stock.toLocaleString()})</span>
                  </div>
                ))}
              </div>
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="transparent" r="40" stroke="#e0e3e5" strokeWidth="12"></circle>
                  {tabletsStock > 0 && <circle cx="50" cy="50" fill="transparent" r="40" stroke="#003d9b" strokeDasharray={`${tabletsLen} ${circ}`} strokeDashoffset={0} strokeWidth="12" className="transition-all duration-500"></circle>}
                  {capsulesStock > 0 && <circle cx="50" cy="50" fill="transparent" r="40" stroke="#505f76" strokeDasharray={`${capsulesLen} ${circ}`} strokeDashoffset={-tabletsLen} strokeWidth="12" className="transition-all duration-500"></circle>}
                  {syrupsStock > 0 && <circle cx="50" cy="50" fill="transparent" r="40" stroke="#3b4358" strokeDasharray={`${syrupsLen} ${circ}`} strokeDashoffset={-(tabletsLen + capsulesLen)} strokeWidth="12" className="transition-all duration-500"></circle>}
                  {otherStock > 0 && <circle cx="50" cy="50" fill="transparent" r="40" stroke="#c3c6d6" strokeDasharray={`${otherLen} ${circ}`} strokeDashoffset={-(tabletsLen + capsulesLen + syrupsLen)} strokeWidth="12" className="transition-all duration-500"></circle>}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline-md text-headline-md text-on-surface font-extrabold">{totalStockVal === 1 && medicines.length === 0 ? 0 : totalStockVal.toLocaleString()}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Total</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm glass-card flex flex-col justify-between">
            <div>
              <h4 className="font-headline-md text-headline-md text-on-surface mb-xl font-bold">Inventory Logs</h4>
              <div className="space-y-lg">
                {recentLogs.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-4">No recent database operations logged.</p>
                ) : (
                  recentLogs.map((log, i) => (
                    <div key={i} className="flex gap-md">
                      <div className={`w-1.5 h-auto ${log.type === "alert" ? "bg-error" : "bg-primary"} rounded-full shrink-0`}></div>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface font-semibold">{log.title}</p>
                        <p className="text-body-sm text-label-sm text-on-surface-variant">{log.description}</p>
                        <p className="text-[11px] text-outline mt-1">{log.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <Link href="/dashboard/otp" className="w-full text-center mt-2xl text-[#003d9b] font-label-md text-label-md border border-[#003d9b] py-3 rounded-xl hover:bg-surface-container-low transition-colors block font-semibold">
              View Recent Orders
            </Link>
          </div>
        </div>
      </main>

      {/* Shared Responsive Bottom Navigation */}
      <BottomNav />

      {/* Add/Edit Modal */}
      <InventoryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleFormSubmit}
        medicine={editingMedicine}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={async () => {
          if (medicineIdToDelete) {
            try {
              await deleteMutation.mutateAsync(medicineIdToDelete);
            } catch (err) {
              console.error(err);
            }
          }
        }}
        title="Delete Medicine"
        message="Are you sure you want to delete this medicine? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
