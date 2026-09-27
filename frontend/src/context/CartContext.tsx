"use client";

import React, { createContext, useContext, ReactNode, useCallback, useSyncExternalStore } from "react";

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

// We keep a cached reference to avoid returning a new array reference on every render,
// which is required by useSyncExternalStore to prevent infinite re-renders.
const emptyCart: CartItem[] = [];
let cachedString: string | null = null;
let cachedParsed: CartItem[] = emptyCart;

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => { };

  // Listen for changes from other tabs
  window.addEventListener('storage', callback);
  // Listen for changes triggered within the same tab
  window.addEventListener('cart-local-update', callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('cart-local-update', callback);
  };
}

function getSnapshot(): CartItem[] {
  if (typeof window === "undefined") return emptyCart;

  const currentString = localStorage.getItem(CART_STORAGE_KEY);
  if (currentString !== cachedString) {
    cachedString = currentString;
    try {
      cachedParsed = currentString ? JSON.parse(currentString) : emptyCart;
    } catch {
      cachedParsed = emptyCart;
    }
  }
  return cachedParsed;
}

function getServerSnapshot(): CartItem[] {
  return emptyCart;
}

export function CartProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore subscribes to localStorage changes automatically
  const storeItems = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Let useSyncExternalStore handle the client transition automatically
  const items = storeItems;

  const updateStore = useCallback((newItems: CartItem[]) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
    // Dispatch custom event so the current tab's subscriber picks up the change
    window.dispatchEvent(new Event('cart-local-update'));
  }, []);

  const addItem = useCallback((item: CartItem) => {
    const exists = storeItems.some(
      (i) => i.itemId === item.itemId && i.licenseType === item.licenseType
    );
    if (exists) return;
    updateStore([...storeItems, item]);
  }, [storeItems, updateStore]);

  const removeItem = useCallback((itemId: string, licenseType?: string) => {
    const newItems = storeItems.filter(
      (item) => !(item.itemId === itemId && item.licenseType === licenseType)
    );
    updateStore(newItems);
  }, [storeItems, updateStore]);

  const clearCart = useCallback(() => {
    updateStore([]);
  }, [updateStore]);

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
