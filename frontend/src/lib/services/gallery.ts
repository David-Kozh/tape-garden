"use server";

import { adminDb } from "../firebase-admin";
import { Beat, User, BeatLicense } from "../../types";
import { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";

export interface BeatWithProducer extends Omit<Beat, "licenses"> {
  producer: {
    uid: string;
    displayName: string;
    avatarUrl?: string;
  };
  licenses: Omit<BeatLicense, "fileUrl">[];
}

export interface GetBeatsOptions {
  tags?: string[];
  limitCount?: number;
  lastDocId?: string;
}

export async function getPublishedBeats(options: GetBeatsOptions = {}): Promise<{ beats: BeatWithProducer[], lastDocId: string | null }> {
  const beatsRef = adminDb.collection("beats");
  
  let q: Query = beatsRef.where("status", "==", "published");

  if (options.tags && options.tags.length > 0) {
    q = q.where("tags", "array-contains-any", options.tags);
  }

  q = q.orderBy("createdAt", "desc");

  if (options.limitCount) {
    q = q.limit(options.limitCount);
  } else {
    q = q.limit(20);
  }

  if (options.lastDocId) {
    const lastDocSnap = await beatsRef.doc(options.lastDocId).get();
    if (lastDocSnap.exists) {
      q = q.startAfter(lastDocSnap);
    }
  }

  const snapshot = await q.get();
  
  if (snapshot.empty) {
    return { beats: [], lastDocId: null };
  }

  const beats = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
    } as Beat;
  });
  
  // Extract unique producer IDs
  const producerIds = Array.from(new Set(beats.map((b: Beat) => b.producerId)));
  
  // Fetch producers using Promise.all to securely grab display names
  const producersMap = new Map<string, Partial<User> & { uid: string }>();
  if (producerIds.length > 0) {
    const producerDocs = await Promise.all(
      producerIds.map(id => adminDb.collection("users").doc(id).get())
    );
    for (const doc of producerDocs) {
      if (doc.exists) {
        producersMap.set(doc.id, { uid: doc.id, ...doc.data() });
      }
    }
  }

  const beatsWithProducers: BeatWithProducer[] = beats.map((beat: Beat) => {
    const producer = producersMap.get(beat.producerId);
    
    // Strip fileUrl for safety before returning to UI
    const safeLicenses = beat.licenses?.map((license: BeatLicense) => ({
      type: license.type,
      price: license.price
    })) as Omit<BeatLicense, "fileUrl">[];

    return {
      ...beat,
      licenses: safeLicenses,
      producer: {
        uid: beat.producerId,
        displayName: producer?.displayName || "Unknown Producer",
        avatarUrl: producer?.producerProfile?.avatarUrl,
      }
    };
  });

  return JSON.parse(JSON.stringify({
    beats: beatsWithProducers,
    lastDocId: snapshot.docs[snapshot.docs.length - 1]?.id || null
  }));
}

export async function getBeatById(id: string): Promise<BeatWithProducer | null> {
  const beatRef = adminDb.collection("beats").doc(id);
  const beatSnap = await beatRef.get();
  
  if (!beatSnap.exists) {
    return null;
  }
  
  const data = beatSnap.data()!;
  const beatData = { 
    id: beatSnap.id, 
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
  } as Beat;
  
  // We should not return fileUrl in public functions, so we strip it from licenses
  const safeLicenses = beatData.licenses?.map(license => {
    return { type: license.type, price: license.price };
  }) as Omit<BeatLicense, "fileUrl">[];
  
  const safeBeat = {
    ...beatData,
    licenses: safeLicenses
  };

  const producerRef = adminDb.collection("users").doc(safeBeat.producerId);
  const producerSnap = await producerRef.get();
  
  let producerInfo: { uid: string; displayName: string; avatarUrl?: string } = {
    uid: safeBeat.producerId,
    displayName: "Unknown Producer",
  };

  if (producerSnap.exists) {
    const producerData = producerSnap.data() as User;
    producerInfo = {
      uid: producerSnap.id,
      displayName: producerData.displayName,
      avatarUrl: producerData.producerProfile?.avatarUrl,
    };
  }

  return JSON.parse(JSON.stringify({
    ...safeBeat,
    producer: producerInfo
  }));
}

export interface GetProducersOptions {
  limitCount?: number;
  lastDocId?: string;
}

export async function getApprovedProducers(options: GetProducersOptions = {}): Promise<{ producers: User[], lastDocId: string | null }> {
  const usersRef = adminDb.collection("users");
  
  let q: Query = usersRef
    .where("role", "==", "producer")
    .where("producerProfile.status", "==", "approved")
    .orderBy("createdAt", "desc");

  if (options.limitCount) {
    q = q.limit(options.limitCount);
  } else {
    q = q.limit(20);
  }

  if (options.lastDocId) {
    const lastDocSnap = await usersRef.doc(options.lastDocId).get();
    if (lastDocSnap.exists) {
      q = q.startAfter(lastDocSnap);
    }
  }

  const snapshot = await q.get();
  const producers = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const data = doc.data()!;
    const profile = data.producerProfile;
    return {
      uid: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      producerProfile: profile ? {
        ...profile,
        lastSlotIncrementDate: profile.lastSlotIncrementDate?.toDate ? profile.lastSlotIncrementDate.toDate().toISOString() : profile.lastSlotIncrementDate
      } : null
    } as User;
  });

  return JSON.parse(JSON.stringify({
    producers,
    lastDocId: snapshot.docs[snapshot.docs.length - 1]?.id || null
  }));
}
