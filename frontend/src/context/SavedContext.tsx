"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import type { SavedItem, ItemType } from "@/types";
import { toast } from "sonner";

export interface SavedItemInput {
  itemId: string;
  itemType: ItemType;
  title: string;
  producerId: string;
  producerName?: string;
  coverArtUrl?: string;
  audioPreviewUrl?: string;
  price?: number;
  bpm?: number;
  key?: string;
}

interface SavedContextType {
  savedItems: SavedItem[];
  savedItemIds: Set<string>;
  isSaved: (itemId: string) => boolean;
  saveItem: (item: SavedItemInput) => Promise<void>;
  unsaveItem: (itemId: string) => Promise<void>;
  toggleSave: (item: SavedItemInput) => Promise<boolean>;
  loading: boolean;
}

const SavedContext = createContext<SavedContextType | undefined>(undefined);

export function SavedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const savedRef = collection(db, "users", user.uid, "savedItems");
    const q = query(savedRef, orderBy("savedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            itemId: data.itemId || docSnap.id,
            itemType: data.itemType || "beat",
            title: data.title || "Untitled",
            producerId: data.producerId || "",
            producerName: data.producerName || "",
            coverArtUrl: data.coverArtUrl || "",
            audioPreviewUrl: data.audioPreviewUrl || "",
            price: typeof data.price === "number" ? data.price : 0,
            bpm: data.bpm ?? undefined,
            key: data.key ?? undefined,
            savedAt: data.savedAt?.toDate ? data.savedAt.toDate() : new Date(),
          } as SavedItem;
        });
        setSavedItems(items);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching saved items:", error);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
      setSavedItems([]);
    };
  }, [user]);

  const activeSavedItems = useMemo(() => (user ? savedItems : []), [user, savedItems]);

  // Keep a Set of IDs for instant O(1) membership checks
  const savedItemIds = useMemo(() => {
    return new Set(activeSavedItems.map((item) => item.itemId));
  }, [activeSavedItems]);

  const isSaved = (itemId: string): boolean => {
    return savedItemIds.has(itemId);
  };

  const saveItem = async (item: SavedItemInput): Promise<void> => {
    if (!user) {
      toast.error("Please sign in to save items for later");
      return;
    }

    const docRef = doc(db, "users", user.uid, "savedItems", item.itemId);
    await setDoc(docRef, {
      itemId: item.itemId,
      itemType: item.itemType,
      title: item.title,
      producerId: item.producerId,
      producerName: item.producerName || "",
      coverArtUrl: item.coverArtUrl || "",
      audioPreviewUrl: item.audioPreviewUrl || "",
      price: item.price ?? 0,
      bpm: item.bpm ?? null,
      key: item.key ?? null,
      savedAt: serverTimestamp(),
    });
  };

  const unsaveItem = async (itemId: string): Promise<void> => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid, "savedItems", itemId);
    await deleteDoc(docRef);
  };

  const toggleSave = async (item: SavedItemInput): Promise<boolean> => {
    if (!user) {
      toast.error("Please sign in to save items for later");
      return false;
    }

    const alreadySaved = savedItemIds.has(item.itemId);

    try {
      if (alreadySaved) {
        await unsaveItem(item.itemId);
        toast.success(`Removed "${item.title}" from saved`);
        return false;
      } else {
        await saveItem(item);
        toast.success(`Saved "${item.title}" for later`);
        return true;
      }
    } catch (error) {
      console.error("Failed to toggle save status:", error);
      toast.error("Failed to update saved item");
      return alreadySaved;
    }
  };

  return (
    <SavedContext.Provider
      value={{
        savedItems: activeSavedItems,
        savedItemIds,
        isSaved,
        saveItem,
        unsaveItem,
        toggleSave,
        loading: isLoading,
      }}
    >
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved() {
  const context = useContext(SavedContext);
  if (context === undefined) {
    throw new Error("useSaved must be used within a SavedProvider");
  }
  return context;
}