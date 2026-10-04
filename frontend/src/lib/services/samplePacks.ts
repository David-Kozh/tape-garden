"use server";

import { adminDb } from "../firebase-admin";
import { SamplePack, User } from "../../types";
import { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";

export interface SamplePackWithProducer extends Omit<SamplePack, "fileUrl"> {
  producer: {
    uid: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface GetSamplePacksOptions {
  tags?: string[];
  limitCount?: number;
  lastDocId?: string;
}

export async function getPublishedSamplePacks(options: GetSamplePacksOptions = {}): Promise<{ packs: SamplePackWithProducer[], lastDocId: string | null }> {
  const packsRef = adminDb.collection("samplePacks");

  let q: Query = packsRef.where("status", "==", "published");

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
    const lastDocSnap = await packsRef.doc(options.lastDocId).get();
    if (lastDocSnap.exists) {
      q = q.startAfter(lastDocSnap);
    }
  }

  const snapshot = await q.get();

  if (snapshot.empty) {
    return { packs: [], lastDocId: null };
  }

  const packs = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
    } as SamplePack;
  });

  // Extract unique producer IDs
  const producerIds = Array.from(new Set(packs.map((p: SamplePack) => p.producerId)));

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

  const packsWithProducers: SamplePackWithProducer[] = packs.map((pack: SamplePack) => {
    const producer = producersMap.get(pack.producerId);

    // Strip fileUrl for safety before returning to UI
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fileUrl, ...safePack } = pack;

    return {
      ...safePack,
      producer: {
        uid: pack.producerId,
        displayName: producer?.displayName || "Unknown Producer",
        avatarUrl: producer?.producerProfile?.avatarUrl,
      }
    };
  });

  return JSON.parse(JSON.stringify({
    packs: packsWithProducers,
    lastDocId: snapshot.docs[snapshot.docs.length - 1]?.id || null
  }));
}

export async function getSamplePackById(id: string): Promise<SamplePackWithProducer | null> {
  const packRef = adminDb.collection("samplePacks").doc(id);
  const packSnap = await packRef.get();

  if (!packSnap.exists) {
    return null;
  }

  const data = packSnap.data()!;
  const packData = {
    id: packSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
  } as SamplePack;

  // We should not return fileUrl in public functions, so we strip it
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fileUrl, ...safePack } = packData;

  const producerRef = adminDb.collection("users").doc(safePack.producerId);
  const producerSnap = await producerRef.get();

  let producerInfo: { uid: string; displayName: string; avatarUrl?: string } = {
    uid: safePack.producerId,
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
    ...safePack,
    producer: producerInfo
  }));
}
