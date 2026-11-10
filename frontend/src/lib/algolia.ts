import { liteClient, LiteClient } from "algoliasearch/lite";
import { BeatWithProducer } from "./services/gallery";

export const ALGOLIA_BEATS_INDEX = "beats";

export interface AlgoliaBeatHit {
  objectID: string;
  title: string;
  producerId: string;
  producerName: string;
  tags: string[];
  bpm: number | null;
  key: string;
  price: number;
  audioPreviewUrl: string;
  coverArtUrl?: string;
  curated?: boolean;
  createdAt: number;
}

let cachedClient: LiteClient | null = null;

function getAlgoliaClient(): LiteClient | null {
  if (cachedClient) return cachedClient;

  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;

  if (!appId || !searchKey) {
    return null;
  }

  cachedClient = liteClient(appId, searchKey);
  return cachedClient;
}

export function isAlgoliaConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID &&
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
  );
}

/**
 * Searches the Algolia `beats` index with typo-tolerance and optional disjunctive (`OR`) genre tag facets.
 * Maps hits directly into `BeatWithProducer` objects for single-step rendering in GalleryClient.
 */
export async function searchAlgoliaBeats(
  query: string,
  tags: string[] = []
): Promise<BeatWithProducer[]> {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn("[searchAlgoliaBeats] Algolia environment variables are not configured.");
    return [];
  }

  // Nested array inside facetFilters applies logical OR across selected genre tags
  const facetFilters = tags.length > 0 ? [tags.map((tag) => `tags:${tag}`)] : undefined;

  const { results } = await client.searchForHits<AlgoliaBeatHit>({
    requests: [
      {
        indexName: ALGOLIA_BEATS_INDEX,
        query: query.trim(),
        hitsPerPage: 24,
        ...(facetFilters ? { facetFilters } : {}),
      },
    ],
  });

  const hits = results[0]?.hits || [];

  return hits.map((hit) => ({
    id: hit.objectID,
    producerId: hit.producerId,
    title: hit.title,
    bpm: hit.bpm ?? 0,
    key: hit.key || "",
    tags: Array.isArray(hit.tags) ? hit.tags : [],
    ...(hit.coverArtUrl ? { coverArtUrl: hit.coverArtUrl } : {}),
    status: "published",
    createdAt: new Date(hit.createdAt || Date.now()).toISOString(),
    updatedAt: new Date(hit.createdAt || Date.now()).toISOString(),
    audioPreviewUrl: hit.audioPreviewUrl,
    curated: Boolean(hit.curated),
    licenses: [
      {
        type: "non-exclusive",
        price: typeof hit.price === "number" ? hit.price : 29.99,
      },
    ],
    producer: {
      uid: hit.producerId,
      displayName: hit.producerName || "Unknown Producer",
      acceptingPayments: true,
    },
  }));
}

