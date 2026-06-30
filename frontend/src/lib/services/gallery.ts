import { collection, query, where, getDocs, limit, orderBy, documentId, startAfter, QueryDocumentSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Beat, User, BeatLicense } from "../../types";

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
  lastDoc?: QueryDocumentSnapshot;
}

export async function getPublishedBeats(options: GetBeatsOptions = {}): Promise<{ beats: BeatWithProducer[], lastDoc: QueryDocumentSnapshot | null }> {
  const beatsRef = collection(db, "beats");
  
  let q = query(
    beatsRef,
    where("status", "==", "published")
  );

  if (options.tags && options.tags.length > 0) {
    // Firestore only supports one array-contains per query, so we use array-contains-any for multiple or array-contains for one
    q = query(q, where("tags", "array-contains-any", options.tags));
  }

  q = query(q, orderBy("createdAt", "desc"));

  if (options.limitCount) {
    q = query(q, limit(options.limitCount));
  } else {
    q = query(q, limit(20)); // Default limit
  }

  if (options.lastDoc) {
    q = query(q, startAfter(options.lastDoc));
  }

  const snapshot = await getDocs(q);
  const beats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Beat));
  
  if (beats.length === 0) {
    return { beats: [], lastDoc: null };
  }

  // Extract unique producer IDs
  const producerIds = Array.from(new Set(beats.map(b => b.producerId)));
  
  // Fetch producers
  const producersMap = new Map<string, User>();
  if (producerIds.length > 0) {
    // Note: 'in' queries support max 10 values. If more than 10, need to chunk.
    const chunkedProducerIds = [];
    for (let i = 0; i < producerIds.length; i += 10) {
      chunkedProducerIds.push(producerIds.slice(i, i + 10));
    }
    
    for (const chunk of chunkedProducerIds) {
      const usersRef = collection(db, "users");
      const usersQ = query(usersRef, where(documentId(), "in", chunk));
      const usersSnap = await getDocs(usersQ);
      usersSnap.forEach(doc => {
        producersMap.set(doc.id, { uid: doc.id, ...doc.data() } as User);
      });
    }
  }

  const beatsWithProducers: BeatWithProducer[] = beats.map(beat => {
    const producer = producersMap.get(beat.producerId);
    
    // Strip fileUrl for safety before returning to UI
    const safeLicenses = beat.licenses?.map(license => ({
      type: license.type,
      price: license.price
    })) as Omit<BeatLicense, "fileUrl">[];

    return {
      ...beat,
      licenses: safeLicenses,
      producer: {
        uid: beat.producerId,
        displayName: producer?.displayName || "Unknown Producer",
        avatarUrl: producer?.producerProfile?.avatarUrl || undefined,
      }
    };
  });

  return {
    beats: beatsWithProducers,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
  };
}

export async function getBeatById(id: string): Promise<BeatWithProducer | null> {
  const beatRef = doc(db, "beats", id);
  const beatSnap = await getDoc(beatRef);
  
  if (!beatSnap.exists()) {
    return null;
  }
  
  const beatData = { id: beatSnap.id, ...beatSnap.data() } as Beat;
  
  // We should not return fileUrl in public functions, so we strip it from licenses
  const safeLicenses = beatData.licenses?.map(license => {
    return { type: license.type, price: license.price };
  }) as Omit<BeatLicense, "fileUrl">[]; // We strip a required field for the frontend view. It's safer to strip it here.
  
  const safeBeat = {
    ...beatData,
    licenses: safeLicenses
  };

  const producerRef = doc(db, "users", safeBeat.producerId);
  const producerSnap = await getDoc(producerRef);
  
  let producerInfo = {
    uid: safeBeat.producerId,
    displayName: "Unknown Producer",
    avatarUrl: undefined as string | undefined,
  };

  if (producerSnap.exists()) {
    const producerData = producerSnap.data() as User;
    producerInfo = {
      uid: producerSnap.id,
      displayName: producerData.displayName,
      avatarUrl: producerData.producerProfile?.avatarUrl,
    };
  }

  return {
    ...safeBeat,
    producer: producerInfo
  };
}

export interface GetProducersOptions {
  limitCount?: number;
  lastDoc?: QueryDocumentSnapshot;
}

export async function getApprovedProducers(options: GetProducersOptions = {}): Promise<{ producers: User[], lastDoc: QueryDocumentSnapshot | null }> {
  const usersRef = collection(db, "users");
  
  let q = query(
    usersRef,
    where("role", "==", "producer"),
    where("producerProfile.status", "==", "approved"),
    orderBy("createdAt", "desc")
  );

  if (options.limitCount) {
    q = query(q, limit(options.limitCount));
  } else {
    q = query(q, limit(20)); // Default limit
  }

  if (options.lastDoc) {
    q = query(q, startAfter(options.lastDoc));
  }

  const snapshot = await getDocs(q);
  const producers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));

  return {
    producers,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
  };
}
