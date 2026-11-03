"use server";

import { adminDb } from "../firebase-admin";
import { Beat, SamplePack, User, BeatLicense } from "../../types";
import { SamplePackWithProducer } from "./samplePacks";
import { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";

export type CuratedCatalogItem =
  | ({ itemType: "beat" } & BeatWithProducer)
  | ({ itemType: "samplePack" } & SamplePackWithProducer);

export interface BeatWithProducer extends Omit<Beat, "licenses"> {
  producer: {
    uid: string;
    displayName: string;
    avatarUrl?: string;
    acceptingPayments?: boolean;
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
  const producerIds = Array.from(new Set(beats.map((b: Beat) => b.producerId).filter(Boolean)));
  
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
        acceptingPayments: producer?.producerProfile?.stripeStatus === "active",
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
  
  let producerInfo: { uid: string; displayName: string; avatarUrl?: string; acceptingPayments?: boolean } = {
    uid: safeBeat.producerId,
    displayName: "Unknown Producer",
    acceptingPayments: false,
  };

  if (producerSnap.exists) {
    const producerData = producerSnap.data() as User;
    producerInfo = {
      uid: producerSnap.id,
      displayName: producerData.displayName,
      avatarUrl: producerData.producerProfile?.avatarUrl,
      acceptingPayments: producerData.producerProfile?.stripeStatus === "active",
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

/**
 * Fetches a random selection of published and curated items (beats and sample packs).
 * Since curated items are a small manually-selected subset, we can efficiently
 * fetch a pool of them and randomly select the desired count on the server.
 */
export async function getRandomCuratedItems(count: number = 2): Promise<CuratedCatalogItem[]> {
  const beatsRef = adminDb.collection("beats");
  const packsRef = adminDb.collection("samplePacks");

  // 1. Fetch published & curated beats and sample packs in parallel
  const [beatsSnapshot, packsSnapshot] = await Promise.all([
    beatsRef.where("status", "==", "published").where("curated", "==", true).limit(100).get(),
    packsRef.where("status", "==", "published").where("curated", "==", true).limit(100).get(),
  ]);

  if (beatsSnapshot.empty && packsSnapshot.empty) {
    return [];
  }

  const combinedPool: Array<{ itemType: "beat" | "samplePack"; doc: QueryDocumentSnapshot }> = [
    ...beatsSnapshot.docs.map((doc) => ({ itemType: "beat" as const, doc })),
    ...packsSnapshot.docs.map((doc) => ({ itemType: "samplePack" as const, doc })),
  ];

  // 2. Server-side random shuffle
  const shuffled = combinedPool.sort(() => 0.5 - Math.random());
  const selectedEntries = shuffled.slice(0, count);

  // 3. Map to raw objects & collect producer IDs
  const rawItems = selectedEntries.map(({ itemType, doc }) => {
    const data = doc.data();
    return {
      itemType,
      data: {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as Beat | SamplePack,
    };
  });

  // 4. Populate producers efficiently
  const producerIds = Array.from(new Set(rawItems.map((entry) => entry.data.producerId).filter(Boolean)));

  const producersMap = new Map<string, Partial<User> & { uid: string }>();
  if (producerIds.length > 0) {
    const producerDocs = await Promise.all(
      producerIds.map((id) => adminDb.collection("users").doc(id).get())
    );
    for (const doc of producerDocs) {
      if (doc.exists) {
        producersMap.set(doc.id, { uid: doc.id, ...doc.data() });
      }
    }
  }

  const itemsWithProducers: CuratedCatalogItem[] = rawItems.map(({ itemType, data }) => {
    const producer = producersMap.get(data.producerId);
    const producerInfo = {
      uid: data.producerId,
      displayName: producer?.displayName || "Unknown Producer",
      avatarUrl: producer?.producerProfile?.avatarUrl,
      acceptingPayments: producer?.producerProfile?.stripeStatus === "active",
    };

    if (itemType === "beat") {
      const beat = data as Beat;
      const safeLicenses = beat.licenses?.map((license: BeatLicense) => ({
        type: license.type,
        price: license.price,
      })) as Omit<BeatLicense, "fileUrl">[];

      return {
        ...beat,
        itemType: "beat",
        licenses: safeLicenses,
        producer: producerInfo,
      };
    } else {
      const pack = data as SamplePack;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { fileUrl, ...safePack } = pack;
      return {
        ...safePack,
        itemType: "samplePack",
        producer: producerInfo,
      };
    }
  });

  return JSON.parse(JSON.stringify(itemsWithProducers));
}

