"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ItemType = "beat" | "samplePack";

export interface CartItem {
  itemId: string;
  itemType: ItemType;
  licenseType?: string; // Used for beats
  price: number;
  title: string;
  producerId: string;
  coverArtUrl?: string;
}

interface CartContextProps {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string, licenseType?: string) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

const CART_STORAGE_KEY = "tapegarden_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (storedCart) {
      try {
        setItems(JSON.parse(storedCart));
      } catch (e) {
        console.error("Failed to parse cart from local storage", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to local storage whenever items change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const addItem = (item: CartItem) => {
    setItems((prevItems) => {
      // Prevent adding exact same item (same id and same license type)
      const exists = prevItems.some(
        (i) => i.itemId === item.itemId && i.licenseType === item.licenseType
      );
      if (exists) return prevItems;
      return [...prevItems, item];
    });
  };

  const removeItem = (itemId: string, licenseType?: string) => {
    setItems((prevItems) => 
      prevItems.filter(
        (item) => !(item.itemId === itemId && item.licenseType === licenseType)
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartTotal = items.reduce((total, item) => total + item.price, 0);
  const itemCount = items.length;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, cartTotal, itemCount }}>
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
