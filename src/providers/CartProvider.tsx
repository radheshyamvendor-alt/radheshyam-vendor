"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string | null;
  quantity: number;
  stock: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
  addMultipleToCart: (items: Array<Omit<CartItem, "category" | "image"> & { category?: string; image?: string | null }>) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("radheshyam_cart");
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setTimeout(() => {
          setCart(parsed);
          setIsLoaded(true);
        }, 0);
        return;
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
      }
    }
    setTimeout(() => {
      setIsLoaded(true);
    }, 0);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("radheshyam_cart", JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((i) => i.id === item.id);
      if (existingItem) {
        const newQty = Math.min(existingItem.quantity + 1, item.stock);
        return prevCart.map((i) =>
          i.id === item.id ? { ...i, quantity: newQty } : i
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart((prevCart) =>
      prevCart
        .map((i) => {
          if (i.id === id) {
            const validQty = Math.max(1, Math.min(quantity, i.stock));
            return { ...i, quantity: validQty };
          }
          return i;
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("radheshyam_scanned_rx");
    }
  };

  const addMultipleToCart = (items: Array<Omit<CartItem, "category" | "image"> & { category?: string; image?: string | null }>) => {
    setCart((prevCart) => {
      const newCart = [...prevCart];
      items.forEach((item) => {
        const existingIndex = newCart.findIndex((i) => i.id === item.id);
        const cartItem: CartItem = {
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category || "Tablets",
          image: item.image || null,
          stock: item.stock,
          quantity: item.quantity,
        };
        
        if (existingIndex > -1) {
          const existingItem = newCart[existingIndex];
          const newQty = Math.min(existingItem.quantity + cartItem.quantity, cartItem.stock);
          newCart[existingIndex] = { ...existingItem, quantity: newQty };
        } else {
          newCart.push({ ...cartItem, quantity: Math.min(cartItem.quantity, cartItem.stock) });
        }
      });
      return newCart;
    });
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalPrice,
        totalItems,
        addMultipleToCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
