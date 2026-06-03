"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAuth from "@/hooks/useAuth";
import { getMedicines, addMedicine, updateMedicine, deleteMedicine, MedicineInput } from "@/app/actions/medicine";
import InventoryDialog from "@/components/dashboard/InventoryDialog";

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

export default function Inventory() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [animateBars, setAnimateBars] = useState(false);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineItem | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Trigger bar animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateBars(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Fetch medicines query
  const { data: queryResult, isLoading, error } = useQuery({
    queryKey: ["medicines", search, category],
    queryFn: () => getMedicines(search, category),
  });

  const medicines = (queryResult?.success ? (queryResult.data ?? []) : []) as MedicineItem[];

  // Client-side pagination calculations
  const paginatedMedicines = medicines.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(medicines.length / pageSize) || 1;

  // Bento Stats calculation
  const totalStock = medicines.reduce((acc: number, m: MedicineItem) => acc + m.stock, 0);
  const lowStockCount = medicines.filter((m: MedicineItem) => m.stock < 10).length;
  const expiringSoonCount = medicines.filter((m: MedicineItem) => m.stock > 0 && m.stock < 15).length;
  const activeCategoriesCount = new Set(medicines.map((m: MedicineItem) => m.category)).size;

  // Category health calculation for donut chart
  const tabletsStock = medicines.filter((m: MedicineItem) => m.category === "Tablets").reduce((acc: number, m: MedicineItem) => acc + m.stock, 0);
  const capsulesStock = medicines.filter((m: MedicineItem) => m.category === "Capsules").reduce((acc: number, m: MedicineItem) => acc + m.stock, 0);
  const syrupsStock = medicines.filter((m: MedicineItem) => m.category === "Syrups").reduce((acc: number, m: MedicineItem) => acc + m.stock, 0);
  const otherStock = medicines.filter((m: MedicineItem) => m.category !== "Tablets" && m.category !== "Capsules" && m.category !== "Syrups").reduce((acc: number, m: MedicineItem) => acc + m.stock, 0);
  const totalStockVal = tabletsStock + capsulesStock + syrupsStock + otherStock || 1;

  // Circle circumference is 2 * PI * r = 2 * 3.14159 * 40 = 251.2
  const circ = 251.2;
  const tabletsLen = (tabletsStock / totalStockVal) * circ;
  const capsulesLen = (capsulesStock / totalStockVal) * circ;
  const syrupsLen = (syrupsStock / totalStockVal) * circ;
  const otherLen = (otherStock / totalStockVal) * circ;

  // Bar chart heights for category health (mobile)
  const categoryBars = [
    { label: "Tablets", stock: tabletsStock, color: "bg-primary" },
    { label: "Capsules", stock: capsulesStock, color: "bg-secondary" },
    { label: "Syrups", stock: syrupsStock, color: "bg-tertiary" },
    { label: "Other", stock: otherStock, color: "bg-outline" },
  ];
  const maxCatStock = Math.max(...categoryBars.map(c => c.stock), 1);

  // Live dynamic activity logs
  const recentLogs = [...medicines]
    .sort((a: MedicineItem, b: MedicineItem) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3)
    .map((med: MedicineItem) => {
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
      queryClient.invalidateQueries({ queryKey: ["catalog-medicines"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MedicineInput }) => updateMedicine(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-medicines"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedicine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-medicines"] });
    },
  });

  const handleOpenAddDialog = () => { setEditingMedicine(null); setIsDialogOpen(true); };
  const handleOpenEditDialog = (med: MedicineItem) => { setEditingMedicine(med); setIsDialogOpen(true); };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this medicine?")) {
      try { await deleteMutation.mutateAsync(id); } catch (err) { console.error(err); }
    }
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

      {/* ── DESKTOP HEADER ── */}
      <header className="hidden md:block bg-surface-container-lowest border-b border-outline-variant shadow-sm sticky top-0 z-50">
        <nav className="flex justify-between items-center w-full px-margin-desktop max-w-[1440px] mx-auto h-20">
          <div className="flex items-center gap-xl">
            <Link href="/dashboard" className="font-headline-md text-headline-md font-bold text-primary hover:opacity-90 transition-opacity">
              Radheshyam Medical
            </Link>
            <div className="flex gap-lg">
              <Link href="/dashboard" className="text-on-secondary-fixed-variant font-medium font-label-md text-label-md hover:text-primary transition-colors duration-200">Dashboard</Link>
              <Link href="/dashboard/catalog" className="text-on-secondary-fixed-variant font-medium font-label-md text-label-md hover:text-primary transition-colors duration-200">Catalog</Link>
              <Link href="/dashboard/inventory" className="text-primary border-b-2 border-primary pb-1 font-bold font-label-md text-label-md">Inventory</Link>
            </div>
          </div>
          <div className="flex items-center gap-md">
            <button onClick={logout} className="font-label-md text-label-md text-on-secondary-fixed-variant hover:text-error transition-colors duration-200">Logout</button>
            <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="User Avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8DDlvrxN56DhF-qAbAW49-l1xusXm4nU0pdNonwGYZJ5XE97jF2-h1-CIu5lqxQRe4_l_1C9v8gpdU2UHA4B9pUiFcZ_8EkVK5rH-JQlDXvDyJc3XAb5YYm-K_B5cXypPVBNdez3Mm8Eii1Iocaj39DhKO8q2uDFva2VFjDDBLk8MI4oW367fb0ujikN0DxZJQqs0buCuPl3oVMDL-u5GPciNVlsEY6DtmneJ9hcVSThwQuosj7WkEYmN0onNVD-DBwKf0cH1Q0k" />
            </div>
          </div>
        </nav>
      </header>

      {/* ── MOBILE HEADER ── */}
      <header className="md:hidden sticky top-0 z-40 bg-surface-container-lowest shadow-sm h-16 flex items-center px-4 justify-between border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary">Inventory</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
          </button>
          <button
            onClick={handleOpenAddDialog}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-lg active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </header>

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
                <p className="text-headline-lg-mobile font-headline-lg-mobile text-primary">
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
                <p className="text-headline-lg-mobile font-headline-lg-mobile text-error">
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
                <p className="text-headline-lg-mobile font-headline-lg-mobile text-primary">
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
            <span className="font-bold text-primary">{activeCategoriesCount}</span>
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
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 h-11 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm outline-none focus:border-primary transition-all text-on-surface"
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
                        <p className="font-bold text-primary text-sm">₹{med.price.toFixed(2)}</p>
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
                          className={`h-full rounded-full transition-all duration-1000 ${isLow ? "bg-error" : "bg-primary"}`}
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
          {medicines.length > pageSize && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-on-surface-variant">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, medicines.length)} of {medicines.length}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-medium disabled:opacity-40">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-medium disabled:opacity-40">Next</button>
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
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Inventory Dashboard</h1>
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
              className="flex items-center gap-xs px-lg h-12 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Add Medicine
            </button>
          </div>
        </div>

        {/* Bento Grid for Stats */}
        <div className="grid grid-cols-4 gap-lg mb-3xl">
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm flex flex-col justify-between glass-card">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-primary-container/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">inventory_2</span>
              </div>
              <span className="text-primary font-label-sm text-label-sm px-2 py-1 rounded bg-primary-container/10">+2.4%</span>
            </div>
            <div className="mt-md">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Total Stock Items</p>
              <h2 className="font-display-lg text-display-lg text-on-surface">{isLoading ? "..." : totalStock.toLocaleString()}</h2>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm flex flex-col justify-between border-l-4 border-l-error glass-card">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-error-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-error">warning</span>
              </div>
              <span className="text-error font-label-sm text-label-sm px-2 py-1 rounded bg-error-container/20">Critical</span>
            </div>
            <div className="mt-md">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Low Stock Alerts</p>
              <h2 className="font-display-lg text-display-lg text-on-surface">{isLoading ? "..." : lowStockCount}</h2>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm flex flex-col justify-between glass-card">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-tertiary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary">event_busy</span>
              </div>
            </div>
            <div className="mt-md">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Expiring &lt; 30 Days</p>
              <h2 className="font-display-lg text-display-lg text-on-surface">{isLoading ? "..." : expiringSoonCount}</h2>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl shadow-sm flex flex-col justify-between glass-card">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">category</span>
              </div>
            </div>
            <div className="mt-md">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Active Categories</p>
              <h2 className="font-display-lg text-display-lg text-on-surface">{isLoading ? "..." : activeCategoriesCount}</h2>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden glass-card">
          <div className="p-lg border-b border-outline-variant flex items-center justify-between gap-md">
            <h3 className="font-headline-md text-headline-md text-on-surface">Inventory Stock List</h3>
            <div className="flex items-center gap-sm flex-1 max-w-md">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase">Name</th>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase">Category</th>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase">Stock Level</th>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase">Price</th>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase">Expiry</th>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {paginatedMedicines.map((med: MedicineItem) => {
                    const percent = Math.min(100, Math.round((med.stock / 500) * 100));
                    const isLow = med.stock < 10;
                    const stockTextColor = isLow ? "text-error" : "text-on-surface";
                    const progressColor = isLow ? "bg-error" : "bg-primary";
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
                              <span className="font-label-md text-label-md text-on-surface">{med.name}</span>
                              <span className="text-body-sm text-label-sm text-outline truncate max-w-[200px]">
                                {med.description || "General Salt Formulation"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-lg py-lg">
                          <span className="px-3 py-1 bg-surface-container-high rounded-full font-label-sm text-label-sm text-on-surface-variant">{med.category}</span>
                        </td>
                        <td className="px-lg py-lg">
                          <div className="flex flex-col gap-1 w-32">
                            <div className={`flex justify-between text-label-sm font-label-sm ${stockTextColor}`}>
                              <span>{med.stock} Units</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-outline-variant rounded-full overflow-hidden">
                              <div className={`h-full ${progressColor}`} style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-lg py-lg font-label-md text-label-md text-on-surface">₹{med.price.toFixed(2)}</td>
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
            <span className="font-label-md text-label-md text-on-surface-variant">
              Showing {medicines.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, medicines.length)} of {medicines.length} medicines
            </span>
            <div className="flex gap-xs">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 border border-outline-variant rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-label-md hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Grid: Category Distribution & Recent Activity */}
        <div className="grid grid-cols-3 gap-lg mt-3xl">
          <div className="col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm glass-card">
            <div className="flex justify-between items-center mb-xl">
              <h4 className="font-headline-md text-headline-md text-on-surface">Stock Category Health</h4>
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
                    <span className="font-label-md text-label-md text-on-surface">{item.label} ({item.stock.toLocaleString()})</span>
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
                  <span className="font-headline-md text-headline-md text-on-surface">{totalStockVal === 1 && medicines.length === 0 ? 0 : totalStockVal.toLocaleString()}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Total</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm glass-card flex flex-col justify-between">
            <div>
              <h4 className="font-headline-md text-headline-md text-on-surface mb-xl">Inventory Logs</h4>
              <div className="space-y-lg">
                {recentLogs.length === 0 ? (
                  <p className="text-sm text-on-surface-variant text-center py-4">No recent database operations logged.</p>
                ) : (
                  recentLogs.map((log, i) => (
                    <div key={i} className="flex gap-md">
                      <div className={`w-1.5 h-auto ${log.type === "alert" ? "bg-error" : "bg-primary"} rounded-full shrink-0`}></div>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface">{log.title}</p>
                        <p className="text-body-sm text-label-sm text-on-surface-variant">{log.description}</p>
                        <p className="text-[11px] text-outline mt-1">{log.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <Link href="/dashboard" className="w-full text-center mt-2xl text-primary font-label-md text-label-md border border-outline-variant py-3 rounded-xl hover:bg-surface-container-low transition-colors block">
              View Recent Orders
            </Link>
          </div>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-margin-mobile h-16 bg-surface-container-lowest border-t border-outline-variant shadow-lg z-50">
        <Link href="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[24px]">home</span>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/dashboard/catalog" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[24px]">verified_user</span>
          <span className="text-[10px] font-bold">Catalog</span>
        </Link>
        <Link href="/dashboard/inventory" className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-xl px-4 py-1">
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory</span>
          <span className="text-[10px] font-bold">Inventory</span>
        </Link>
      </nav>

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
