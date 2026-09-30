import { db, auth } from "../firebase";
import { doc, updateDoc, setDoc, serverTimestamp, getDoc, deleteDoc } from "firebase/firestore";
import { Beat } from "@/types";

/**
 * Toggles the curated status of a beat.
 */
export async function toggleCurated(beatId: string, curated: boolean) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  const beatRef = doc(db, "beats", beatId);
  await updateDoc(beatRef, { curated });
}

/**
 * Flags a beat for moderation by an admin.
 */
export async function flagBeat(beatId: string, reason: string = "Admin moderation flag") {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  // Get beat for denormalization
  const beatRef = doc(db, "beats", beatId);
  const beatSnap = await getDoc(beatRef);
  if (!beatSnap.exists()) throw new Error("Beat not found");
  
  const beatData = beatSnap.data() as Beat;
  
  // Get producer doc for denormalization
  const producerRef = doc(db, "users", beatData.producerId);
  const producerSnap = await getDoc(producerRef);
  const producerName = producerSnap.exists() ? producerSnap.data().displayName : "Unknown Producer";
  
  // Set flag document
  const flaggedRef = doc(db, "flaggedBeats", beatId);
  await setDoc(flaggedRef, {
    beatId,
    flaggedBy: auth.currentUser.uid,
    flaggedAt: serverTimestamp(),
    reason,
    status: "pending",
    title: beatData.title,
    producerId: beatData.producerId,
    producerName
  });
}

/**
 * Resolves a flagged beat by either dismissing the flag or removing the beat.
 */
export async function resolveFlaggedBeat(beatId: string, action: 'dismiss' | 'remove') {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  const flaggedRef = doc(db, "flaggedBeats", beatId);
  
  if (action === 'dismiss') {
    await deleteDoc(flaggedRef);
  } else if (action === 'remove') {
    const beatRef = doc(db, "beats", beatId);
    await updateDoc(beatRef, { status: "suspended" });
    await updateDoc(flaggedRef, { status: "reviewed" });
  }
}
