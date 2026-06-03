"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { useCart } from "@/providers/CartProvider";
import { getMedicines } from "@/app/actions/medicine";
import CartBar from "@/components/ui/CartBar";

export default function Catalog() {
  const { logout } = useAuth();
  const { addToCart, cart } = useCart();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Track added items for instant feedback animation
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

  // Fetch catalog medicines
  const { data: queryResult, isLoading, error } = useQuery({
    queryKey: ["catalog-medicines", search, activeCategory],
    queryFn: () => getMedicines(search, activeCategory),
  });

  const medicines = queryResult?.success ? (queryResult.data ?? []) : [];

  const handleCheckoutRedirect = () => {
    router.push("/dashboard/checkout");
  };

  const handleAddToCart = (med: any) => {
    addToCart({
      id: med.id,
      name: med.name,
      price: med.price,
      category: med.category,
      image: med.image,
      stock: med.stock
    });

    setAddedItems((prev) => ({ ...prev, [med.id]: true }));
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [med.id]: false }));
    }, 1500);
  };

  // Category Configuration
  const categoryConfig = [
    { name: "Tablets", icon: "pill", bg: "bg-primary-container text-on-primary-container" },
    { name: "Capsules", icon: "pill", bg: "bg-secondary-container text-on-secondary-container" },
    { name: "Injections", icon: "vaccines", bg: "bg-tertiary-fixed text-on-tertiary-fixed" },
    { name: "Syrups", icon: "water_drop", bg: "bg-primary-container text-on-primary-container" },
    { name: "Drops", icon: "opacity", bg: "bg-secondary-container text-on-secondary-container" },
    { name: "Ointments", icon: "medication_liquid", bg: "bg-tertiary-fixed text-on-tertiary-fixed" },
    { name: "Medical Devices", displayName: "Devices", icon: "medical_services", bg: "bg-primary-container text-on-primary-container" },
  ];

  return (
    <div className="min-h-screen bg-background trust-gradient pb-24 md:pb-12 text-on-surface">
      {/* Desktop TopNavBar */}
      <header className="hidden md:flex justify-between items-center w-full px-margin-desktop max-w-max-width mx-auto h-20 bg-surface-container-lowest sticky top-0 z-50 shadow-sm border-b border-outline-variant">
        <Link href="/dashboard" className="font-headline-md text-headline-md font-bold text-primary hover:opacity-90 transition-opacity">
          Radheshyam Medical
        </Link>
        <nav className="flex gap-lg items-center">
          <Link href="/dashboard" className="text-on-secondary-fixed-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md">
            Dashboard
          </Link>
          <Link href="/dashboard/catalog" className="text-primary border-b-2 border-primary pb-1 font-bold font-label-md text-label-md">
            Catalog
          </Link>
          <Link href="/dashboard/inventory" className="text-on-secondary-fixed-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md">
            Inventory
          </Link>
        </nav>
        <div className="flex items-center gap-md">
          <button 
            onClick={logout}
            className="text-on-secondary-fixed-variant font-medium font-label-md text-label-md hover:text-primary"
          >
            Logout
          </button>
          <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden border border-outline-variant">
            <img 
              alt="User Avatar" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-NP8DFr-klP9qPtwq0dCx2Jz_Ij75ghI0V_O5iwOZtW3CN2YCzycpZDAeTrFoqFbZ1yfIxLBPUAMMVwt_hLgH679RCJwvanNvuZ5yQecvuNNg-MEUFKPSDh7VUpe_FXfepH_rIWm4xbl-hj5zeD91HpeLXvKq-NpeSCtcTYn7ADsVMF9kMK3wEy-3tFjyl7l_Jlt06kmr_xOjoi_f_F3-yzDjJM-JhjL3Q9BhxyAR_QwVsM4g1jmzmUrfq7uMJg_nZUuc8zzihV0"
            />
          </div>
        </div>
      </header>

      {/* Mobile Top Bar */}
      <div className="md:hidden flex justify-between items-center px-margin-mobile h-16 bg-surface-container-lowest border-b border-outline-variant">
        <span className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">Radheshyam Medical</span>
        <span className="material-symbols-outlined text-primary text-[24px]">notifications</span>
      </div>

      <main className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        {/* Hero / Search Section */}
        <section className="mb-3xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-lg mb-xl">
            <div>
              <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Medicine Catalog</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Find the right medication quickly and reliably.</p>
            </div>
            <div className="relative w-full md:w-96 group">
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-outline bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:ring-opacity-10 focus:border-primary transition-all outline-none text-on-surface" 
                placeholder="Search medicines, categories..." 
                type="text"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
            </div>
          </div>
        </section>

        {/* Category Bento Grid */}
        <section className="mb-3xl">
          <div className="flex items-center gap-2 mb-lg">
            <span className="material-symbols-outlined text-primary">category</span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Categories</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-md select-none">
            {categoryConfig.map((cat) => {
              const isActive = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(isActive ? "All" : cat.name)}
                  className={`group flex flex-col items-center justify-center p-lg rounded-xl shadow-sm hover:shadow-md transition-all border ${
                    isActive 
                      ? "bg-primary text-on-primary border-primary ring-2 ring-primary/20" 
                      : "bg-surface-container-lowest border-outline-variant hover:border-primary"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-sm group-hover:scale-110 transition-transform ${
                    isActive ? "bg-white/20 text-white" : cat.bg
                  }`}>
                    <span className="material-symbols-outlined">{cat.icon}</span>
                  </div>
                  <span className={`font-label-md text-label-md ${isActive ? "text-on-primary font-bold" : "text-on-surface"}`}>
                    {cat.displayName || cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Featured Medicines Section */}
        <section>
          <div className="flex items-center justify-between mb-lg">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">verified</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {activeCategory === "All" ? "Featured Medicines" : `${activeCategory} List`}
              </h2>
            </div>
            {activeCategory !== "All" && (
              <button 
                onClick={() => setActiveCategory("All")}
                className="text-primary font-label-md text-label-md hover:underline font-bold"
              >
                View All
              </button>
            )}
          </div>

          {/* Medicines Grid list */}
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl glass-card">
              <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="mt-4 text-on-surface-variant text-sm font-semibold">Loading catalog list...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-error font-medium bg-surface-container-lowest border border-outline-variant rounded-xl glass-card">
              Failed to load medicines: {(error as any).message || "Unknown error occurred"}
            </div>
          ) : medicines.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant font-medium bg-surface-container-lowest border border-outline-variant rounded-xl glass-card">
              No stock medicines found in "{activeCategory}". Add new items in the Inventory panel.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
              {medicines.map((med: any) => {
                const inCartItem = cart.find((i) => i.id === med.id);
                const remainingStock = med.stock - (inCartItem?.quantity || 0);
                const isOutOfStock = remainingStock <= 0;
                const isLowStock = remainingStock > 0 && remainingStock < 10;
                
                // Strike-through list price calculation for premium aesthetic (MRP vs Sale Price)
                const mockListPrice = med.price * 1.25;
                const isAdded = addedItems[med.id];

                return (
                  <div
                    key={med.id}
                    className="group bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-all"
                  >
                    {/* Image / Icon container */}
                    <div className="relative h-48 bg-surface-container-low p-md overflow-hidden flex items-center justify-center text-outline">
                      {med.image ? (
                        <img
                          src={med.image}
                          alt={med.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-[64px]">medication</span>
                      )}
                      
                      <span className="absolute top-3 left-3 bg-surface-variant text-on-surface-variant font-label-sm text-label-sm px-2.5 py-1 rounded-full border border-outline-variant shadow-sm uppercase font-bold tracking-wider">
                        {med.category}
                      </span>
                    </div>

                    <div className="p-lg flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-sm gap-2">
                        <h3 className="font-headline-md text-body-lg font-bold text-on-surface truncate" title={med.name}>
                          {med.name}
                        </h3>
                        
                        {isOutOfStock ? (
                          <span className="flex items-center gap-1 text-[#ba1a1a] font-label-sm text-label-sm bg-[#ffdad6] px-2 py-0.5 rounded shrink-0">
                            <span className="material-symbols-outlined text-sm">inventory_2</span> Sold Out
                          </span>
                        ) : isLowStock ? (
                          <span className="flex items-center gap-1 text-[#b45309] font-label-sm text-label-sm bg-[#fef3c7] px-2 py-0.5 rounded shrink-0">
                            <span className="material-symbols-outlined text-sm">warning</span> Low Stock
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[#1d804e] font-label-sm text-label-sm bg-[#e7f3ec] px-2 py-0.5 rounded shrink-0">
                            <span className="material-symbols-outlined text-sm">check_circle</span> In Stock
                          </span>
                        )}
                      </div>

                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg line-clamp-2">
                        {med.description || "Clinically certified medical formulation for pharmacy distribution."}
                      </p>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface-variant line-through">
                            ₹{mockListPrice.toFixed(2)}
                          </span>
                          <span className="font-headline-md text-headline-md text-primary font-bold">
                            ₹{med.price.toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleAddToCart(med)}
                          disabled={isOutOfStock}
                          className={`px-lg py-sm rounded-xl font-label-md text-label-md flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                            isAdded 
                              ? "bg-[#1d804e] text-on-primary" 
                              : "bg-primary hover:bg-primary-container text-on-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isAdded ? "done" : "add_shopping_cart"}
                          </span>
                          <span>{isAdded ? "Added" : "Add"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating Sticky Cart Bar */}
      <CartBar onCheckout={handleCheckoutRedirect} />

      {/* Mobile BottomNavBar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-margin-mobile pb-safe h-16 bg-surface-container-lowest dark:bg-inverse-surface border-t border-outline-variant z-40">
        <Link href="/dashboard" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1">
          <span className="material-symbols-outlined">home</span>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/dashboard/catalog" className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-xl px-4 py-1 scale-95 transition-transform duration-150">
          <span className="material-symbols-outlined">verified_user</span>
          <span className="text-[10px] font-bold">Catalog</span>
        </Link>
        <Link href="/dashboard/inventory" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1">
          <span className="material-symbols-outlined">inventory</span>
          <span className="text-[10px] font-bold">Inventory</span>
        </Link>
      </nav>
    </div>
  );
}
