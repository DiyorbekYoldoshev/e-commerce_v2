import React, { createContext, useContext, useState, useCallback } from "react";
import type { Product, ProductVariant, CartItem } from "@/types";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (variantId: number) => void;
  updateQuantity: (variantId: number, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const saveItems = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem("cart", JSON.stringify(newItems));
  };

  const addItem = useCallback((product: Product, variant: ProductVariant, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.variant.id === variant.id);
      let newItems: CartItem[];
      if (existing) {
        newItems = prev.map(i =>
          i.variant.id === variant.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      } else {
        newItems = [...prev, { product, variant, quantity }];
      }
      localStorage.setItem("cart", JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  const removeItem = useCallback((variantId: number) => {
    setItems(prev => {
      const newItems = prev.filter(i => i.variant.id !== variantId);
      localStorage.setItem("cart", JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  const updateQuantity = useCallback((variantId: number, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev => {
      const newItems = prev.map(i =>
        i.variant.id === variantId ? { ...i, quantity } : i
      );
      localStorage.setItem("cart", JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  const clearCart = useCallback(() => {
    saveItems([]);
  }, []);

  const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.variant.price) * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalAmount, totalItems }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
