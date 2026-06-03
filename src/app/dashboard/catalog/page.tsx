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

  // Fetch catalog medicines
  const { data: queryResult, isLoading, error } = useQuery({
    queryKey: ["catalog-medicines", search, activeCategory],
    queryFn: () => getMedicines(search, activeCategory),
  });

  const medicines = queryResult?.success ? (queryResult.data ?? []) : [];

  const handleCheckoutRedirect = () => {
    router.push("/dashboard/checkout");
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
    <div className="min-h-screen bg-background trust-gradient p-6 pb-32">
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
          <Link href="/dashboard/inventory" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-all">
            Inventory
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

      {/* Main Container */}
      <main className="max-w-[960px] mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-6 glass-card">
          <h2 className="text-headline-md font-bold text-on-surface">Medicine Catalog</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Browse our pharmacy stock list and add products to the checkout queue.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-surface border border-outline-variant shadow-sm rounded-xl p-4 space-y-4 glass-card">
          {/* Search bar */}
          <div className="relative group w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicines by name..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm text-on-surface"
              type="text"
            />
          </div>

          {/* Category Pill Selection */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin select-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all border shrink-0 ${
                  activeCategory === cat
                    ? "bg-primary text-on-primary border-primary shadow-sm"
                    : "bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Medicines Grid list */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center bg-surface border border-outline-variant shadow-sm rounded-xl glass-card">
            <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="mt-4 text-on-surface-variant text-sm font-semibold">Loading catalog catalog...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-error font-medium bg-surface border border-outline-variant rounded-xl glass-card">
            Failed to load medicines: {(error as any).message || "Unknown error occurred"}
          </div>
        ) : medicines.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant font-medium bg-surface border border-outline-variant rounded-xl glass-card">
            No stock medicines found in category "{activeCategory}". Add some in the Inventory panel.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {medicines.map((med: any) => {
              const inCartItem = cart.find((i) => i.id === med.id);
              const remainingStock = med.stock - (inCartItem?.quantity || 0);
              const isOutOfStock = remainingStock <= 0;

              return (
                <div
                  key={med.id}
                  className="bg-surface border border-outline-variant shadow-sm rounded-2xl overflow-hidden glass-card flex flex-col justify-between hover:shadow-md transition-all duration-300 group"
                >
                  <div>
                    {/* Image Box */}
                    <div className="h-40 bg-surface-container-high border-b border-outline-variant overflow-hidden flex items-center justify-center text-outline relative">
                      {med.image ? (
                        <img
                          src={med.image}
                          alt={med.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-[48px]">medication</span>
                      )}
                      
                      {/* Stock Label Overlay */}
                      {isOutOfStock ? (
                        <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-error text-on-error shadow-sm">
                          Out of Stock
                        </span>
                      ) : remainingStock < 10 ? (
                        <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500 text-white shadow-sm">
                          Only {remainingStock} left
                        </span>
                      ) : null}
                    </div>

                    {/* Metadata Box */}
                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
                          {med.category}
                        </span>
                        <span className="text-sm font-bold text-primary">₹{med.price.toFixed(2)}</span>
                      </div>
                      <h4 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors">
                        {med.name}
                      </h4>
                      {med.description && (
                        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                          {med.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Add To Cart Trigger */}
                  <div className="p-5 pt-0">
                    <button
                      onClick={() => addToCart({
                        id: med.id,
                        name: med.name,
                        price: med.price,
                        category: med.category,
                        image: med.image,
                        stock: med.stock
                      })}
                      disabled={isOutOfStock}
                      className="w-full h-11 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all shadow"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Sticky Cart Bar */}
      <CartBar onCheckout={handleCheckoutRedirect} />
    </div>
  );
}
