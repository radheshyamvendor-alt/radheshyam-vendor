"use client";

import { useCart } from "@/providers/CartProvider";
import { useState } from "react";

interface CartBarProps {
  onCheckout: () => void;
}

export default function CartBar({ onCheckout }: CartBarProps) {
  const { cart, totalPrice, totalItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const [isExpanded, setIsExpanded] = useState(false);

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-40 transition-all duration-300">
      <div className="bg-surface border border-outline-variant shadow-xl rounded-2xl p-4 glass-card flex flex-col gap-3">
        {/* Expanded cart detail panel */}
        {isExpanded && (
          <div className="border-b border-outline-variant pb-3 max-h-48 overflow-y-auto divide-y divide-outline-variant scrollbar-thin">
            <h4 className="font-bold text-sm text-on-surface mb-2 flex items-center justify-between">
              <span>Cart Items</span>
              <button 
                onClick={() => setIsExpanded(false)} 
                className="text-xs text-primary hover:underline font-semibold"
              >
                Hide
              </button>
            </h4>
            {cart.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex-grow pr-3">
                  <span className="font-semibold text-on-surface block">{item.name}</span>
                  <span className="text-on-surface-variant text-[10px]">₹{item.price.toFixed(2)} / unit</span>
                </div>
                
                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-outline-variant bg-surface-container-lowest rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-90 transition-transform"
                      type="button"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-semibold text-on-surface select-none">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-90 transition-transform"
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="w-6 h-6 flex items-center justify-center text-error hover:bg-error-container/10 rounded-full active:scale-90 transition-transform"
                    type="button"
                    title="Remove item"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Bar Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center relative active:scale-95 transition-transform"
              title={isExpanded ? "Collapse cart" : "Expand cart details"}
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-on-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            </button>
            <div>
              <span className="text-xs text-on-surface-variant block font-medium">Cart Total</span>
              <span className="font-bold text-on-surface text-base block">₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearCart}
              className="w-10 h-10 flex items-center justify-center text-error hover:bg-error-container/10 rounded-full active:scale-90 transition-transform mr-1"
              title="Clear cart & prescription details"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
            <button
              onClick={onCheckout}
              className="px-5 py-3 bg-primary text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 shadow-md hover:bg-on-primary-fixed-variant active:scale-[0.97] transition-all"
            >
              <span>View Cart</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
