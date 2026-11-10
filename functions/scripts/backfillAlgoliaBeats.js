const fs = require("fs");
const path = require("path");
const { initializeApp, getApps, getApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { algoliasearch } = require("algoliasearch");

const ALGOLIA_BEATS_INDEX = "beats";

function buildAlgoliaBeatRecord(beatId, beatData, producerName) {
  const createdAtVal = beatData.createdAt;
  let createdAtMs = Date.now();
  if (createdAtVal && typeof createdAtVal.toMillis === "function") {
    createdAtMs = createdAtVal.toMillis();
  } else if (typeof createdAtVal === "string" || typeof createdAtVal === "number") {
    const parsed = new Date(createdAtVal).getTime();
    if (!isNaN(parsed)) createdAtMs = parsed;
  }

  const licenses = Array.isArray(beatData.licenses) ? beatData.licenses : [];
  const price = typeof licenses[0]?.price === "number" ? licenses[0].price : 29.99;

  return {
    objectID: beatId,
    title: beatData.title || "",
    producerId: beatData.producerId || "",
    producerName: producerName || "Unknown Producer",
    tags: Array.isArray(beatData.tags) ? beatData.tags : [],
    bpm: typeof beatData.bpm === "number" ? beatData.bpm : null,
    key: beatData.key || "",
    price,
    audioPreviewUrl: beatData.audioPreviewUrl || "",
    coverArtUrl: beatData.coverArtUrl || "",
    curated: Boolean(beatData.curated),
    createdAt: createdAtMs,
  };
}

async function runBackfill() {
  const appId = "KP5555NO87";
  const adminKey = "340d59a8febaf3c6ea826577b75f1aa0";

  if (!appId || !adminKey) {
    console.error("Error: Missing ALGOLIA_ADMIN_KEY.");
    console.log("Usage: ALGOLIA_ADMIN_KEY=<key> npm --prefix functions run backfill:algolia");
    console.log("   or: node scripts/backfillAlgoliaBeats.js <ALGOLIA_ADMIN_KEY>");
    process.exit(1);
  }

  const localServiceAccountPath = path.join(__dirname, "..", "service-account-firebase-adminsdk.json");
  if (!getApps().length) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(localServiceAccountPath)) {
      const serviceAccount = require(localServiceAccountPath);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: "tape-garden",
      });
      console.log("Initialized Firebase Admin with local service-account-firebase-adminsdk.json.");
    } else {
      initializeApp({ projectId: "tape-garden" });
      console.log("Initialized Firebase Admin with Application Default Credentials.");
    }
  }

  const db = getFirestore(getApp(), "tape-garden-db");
  const client = algoliasearch(appId, adminKey);

  console.log(`Configuring Algolia '${ALGOLIA_BEATS_INDEX}' index settings (App ID: ${appId})...`);
  const settingsResp = await client.setSettings({
    indexName: ALGOLIA_BEATS_INDEX,
    indexSettings: {
      searchableAttributes: ["title", "tags", "producerName"],
      attributesForFaceting: ["filterOnly(tags)"],
      customRanking: ["desc(createdAt)"],
    },
  });
  await client.waitForTask({
    indexName: ALGOLIA_BEATS_INDEX,
    taskID: settingsResp.taskID,
  });
  console.log("Index settings updated and confirmed.");

  console.log("Fetching published beats from tape-garden-db...");
  const beatsSnap = await db.collection("beats").where("status", "==", "published").get();

  if (beatsSnap.empty) {
    console.log("No published beats found in Firestore.");
    return;
  }

  const producerIds = Array.from(
    new Set(beatsSnap.docs.map((doc) => doc.data().producerId).filter(Boolean))
  );

  const producersMap = new Map();
  if (producerIds.length > 0) {
    const producerDocs = await Promise.all(
      producerIds.map((id) => db.collection("users").doc(id).get())
    );
    for (const doc of producerDocs) {
      if (doc.exists) {
        producersMap.set(doc.id, doc.data());
      }
    }
  }

  const eligibleObjects = [];
  const ineligibleObjectIds = [];

  for (const doc of beatsSnap.docs) {
    const beatData = doc.data();
    const producerData = producersMap.get(beatData.producerId);

    const isEligible = Boolean(
      producerData &&
      producerData.role === "producer" &&
      producerData.producerProfile?.status === "approved" &&
      producerData.producerProfile?.stripeStatus === "active"
    );

    if (isEligible && producerData) {
      const record = buildAlgoliaBeatRecord(
        doc.id,
        beatData,
        producerData.displayName || "Unknown Producer"
      );
      eligibleObjects.push(record);
    } else {
      ineligibleObjectIds.push(doc.id);
    }
  }

  if (eligibleObjects.length > 0) {
    await client.saveObjects({
      indexName: ALGOLIA_BEATS_INDEX,
      objects: eligibleObjects,
      waitForTasks: true,
    });
    console.log(`Indexed ${eligibleObjects.length} eligible published beats to Algolia.`);
  } else {
    console.log("0 published beats met producer payment eligibility (stripeStatus === 'active').");
  }

  if (ineligibleObjectIds.length > 0) {
    await client.deleteObjects({
      indexName: ALGOLIA_BEATS_INDEX,
      objectIDs: ineligibleObjectIds,
      waitForTasks: true,
    });
    console.log(`Removed ${ineligibleObjectIds.length} ineligible beats from Algolia.`);
  }

  console.log("Backfill complete!");
}

runBackfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
