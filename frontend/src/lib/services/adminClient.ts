import { db, auth } from "../firebase";
import { doc, updateDoc, setDoc, serverTimestamp, getDoc, deleteDoc } from "firebase/firestore";
import { Beat, SamplePack, ItemType } from "@/types";

/**
 * Toggles the curated status of a beat or sample pack.
 */
export async function toggleCurated(itemId: string, itemType: ItemType, curated: boolean) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  const collectionName = itemType === "samplePack" ? "samplePacks" : "beats";
  const itemRef = doc(db, collectionName, itemId);
  await updateDoc(itemRef, { curated });
}

/**
 * Flags a beat or sample pack for moderation by an admin.
 */
export async function flagItem(itemId: string, itemType: ItemType, reason: string = "Admin moderation flag") {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  const collectionName = itemType === "samplePack" ? "samplePacks" : "beats";
  const itemRef = doc(db, collectionName, itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) throw new Error("Item not found");
  
  const itemData = itemSnap.data() as Beat | SamplePack;
  
  // Get producer doc for denormalization
  const producerRef = doc(db, "users", itemData.producerId);
  const producerSnap = await getDoc(producerRef);
  const producerName = producerSnap.exists() ? producerSnap.data().displayName : "Unknown Producer";
  
  // Set flag document
  const flaggedRef = doc(db, "flaggedItems", itemId);
  await setDoc(flaggedRef, {
    itemId,
    itemType,
    flaggedBy: auth.currentUser.uid,
    flaggedAt: serverTimestamp(),
    reason,
    status: "pending",
    title: itemData.title,
    producerId: itemData.producerId,
    producerName
  });
}

/**
 * Resolves a flagged item by either dismissing the flag or removing the item.
 */
export async function resolveFlaggedItem(itemId: string, itemType: ItemType, action: "dismiss" | "remove") {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  const flaggedRef = doc(db, "flaggedItems", itemId);
  
  if (action === "dismiss") {
    await deleteDoc(flaggedRef);
  } else if (action === "remove") {
    const collectionName = itemType === "samplePack" ? "samplePacks" : "beats";
    const itemRef = doc(db, collectionName, itemId);
    await updateDoc(itemRef, { status: "suspended" });
    await updateDoc(flaggedRef, { status: "reviewed" });
  }
}
