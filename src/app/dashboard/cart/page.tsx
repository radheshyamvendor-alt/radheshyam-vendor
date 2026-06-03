"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { useCart } from "@/providers/CartProvider";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";

export default function CartPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const { cart, totalPrice, totalItems, updateQuantity, removeFromCart } = useCart();

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
        {/* Page Title */}
        <div className="mb-xl">
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Your Medical Cart</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-base">Review your selected items and proceed to prescription verification.</p>
        </div>

        {totalItems === 0 ? (
          /* Empty State */
          <div className="max-w-xl mx-auto text-center py-16 px-4 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm glass-card flex flex-col items-center justify-center space-y-6">
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
              className="px-6 py-3 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-on-primary-fixed-variant active:scale-95 transition-all shadow-md inline-block"
            >
              Browse Medicine Catalog
            </Link>
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

              {/* Add more items card trigger */}
              <Link
                href="/dashboard/catalog"
                className="border-2 border-dashed border-outline-variant rounded-xl p-xl flex flex-col items-center justify-center text-center group hover:border-primary hover:bg-primary/5 transition-all duration-300 block"
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors mb-md">
                  <span className="material-symbols-outlined text-[24px]">add_circle</span>
                </div>
                <h4 className="font-headline-md text-headline-md text-on-surface">Add more medicines</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Need to add another prescription or OTC item?</p>
              </Link>
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
