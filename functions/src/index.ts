import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Cloud Function Trigger: onUserCreated
 * Automatically executes when a new user registers via Firebase Auth (Email/Password or Google).
 * Provisions the user document in Firestore with role: "buyer" and sets the custom JWT claims.
 */
export const onUserCreatedHandler = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .auth.user()
  .onCreate(async (user) => {
    const { uid, email, displayName } = user;
    const finalEmail = email || "";
    const finalDisplayName = displayName || email?.split("@")[0] || "Anonymous Garden Guest";

    console.log(`[onUserCreated] Initializing profile for user: ${uid} (${finalEmail})`);

    try {
      // 1. Assign custom JWT claims (role and boolean flag for client-side and middleware route checking)
      await admin.auth().setCustomUserClaims(uid, {
        role: "buyer",
        buyer: true,
      });
      console.log(`[onUserCreated] Successfully set custom claims (role: buyer) for user: ${uid}`);

      // 2. Provision the database profile document in the /users collection
      const db = getFirestore(admin.app(), "tape-garden-db");
      await db.collection("users").doc(uid).set({
        uid: uid,
        role: "buyer",
        email: finalEmail,
        displayName: finalDisplayName,
        createdAt: FieldValue.serverTimestamp(),
        stripeCustomerId: null,
      });
      console.log(`[onUserCreated] Successfully created Firestore users document for user: ${uid}`);
    } catch (error) {
      console.error(`[onUserCreated] Error provisioning user profile for ${uid}:`, error);
      throw error;
    }
  });

interface ReviewApplicationData {
  applicationId: string;
  action: "approve" | "decline";
}

/**
 * Cloud Function HTTPS Callable: reviewApplication
 * Admin-only tool for reviewing producer applications.
 * Validates admin status, updates application state, and if approved,
 * provisions the user account in Firebase Auth and Firestore.
 */
export const reviewApplication = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .https.onCall(async (data: unknown, context) => {
    // 1. Verify that the caller is authenticated and has administrative privileges
    if (!context.auth || (context.auth.token.role !== "admin" && !context.auth.token.admin)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only authenticated administrators are authorized to review applications."
      );
    }

    const { applicationId, action } = (data || {}) as ReviewApplicationData;

    // 2. Validate input fields
    if (!applicationId || !["approve", "decline"].includes(action)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Valid 'applicationId' and 'action' ('approve' or 'decline') are required."
      );
    }

    console.log(`[reviewApplication] Reviewing application ${applicationId} with action: ${action}`);

    const db = getFirestore(admin.app(), "tape-garden-db");
    const appRef = db.collection("applications").doc(applicationId);

    try {
      return await db.runTransaction(async (transaction) => {
        const appDoc = await transaction.get(appRef);
        if (!appDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Application not found.");
        }

        const appData = appDoc.data()!;
        if (appData.status !== "pending") {
          throw new functions.https.HttpsError("failed-precondition", "Application is no longer pending.");
        }

        const { email, displayName } = appData;

        if (action === "approve") {
          // Provision Producer Account
          let uid: string;
          let isNewUser = false;
          try {
            const userRecord = await admin.auth().getUserByEmail(email);
            uid = userRecord.uid;
            console.log(`[reviewApplication] Existing Firebase Auth user found with UID: ${uid}`);
          } catch (error) {
            const authErr = error as { code?: string };
            if (authErr.code === "auth/user-not-found") {
              const userRecord = await admin.auth().createUser({
                email,
                displayName,
                password: Math.random().toString(36).slice(-10) + "Prod!" + Math.random().toString(36).slice(-2).toUpperCase(),
              });
              uid = userRecord.uid;
              isNewUser = true;
              console.log(`[reviewApplication] Firebase Auth user created with UID: ${uid}`);
            } else {
              throw error;
            }
          }

          // Assign producer custom claims
          await admin.auth().setCustomUserClaims(uid, {
            role: "producer",
            producer: true,
          });

          const userRef = db.collection("users").doc(uid);
          const producerProfile = {
            status: "approved",
            allocatedBeatSlots: 2,
            allocatedSamplePackSlots: 2,
            lastSlotIncrementDate: FieldValue.serverTimestamp(),
            bio: "",
            socialLinks: [],
            avatarUrl: "",
          };

          if (isNewUser) {
            transaction.set(userRef, {
              uid: uid,
              role: "producer",
              email: email,
              displayName: displayName,
              createdAt: FieldValue.serverTimestamp(),
              stripeCustomerId: null,
              stripeAccountId: null,
              producerProfile: producerProfile,
            });
          } else {
            transaction.set(userRef, {
              role: "producer",
              stripeAccountId: null,
              producerProfile: producerProfile,
            }, { merge: true });
          }

          console.log(`[reviewApplication] Simulated Email Send: Producer application APPROVED for ${email}.`);
        } else {
          console.log(`[reviewApplication] Simulated Email Send: Producer application DECLINED for ${email}.`);
        }

        // Update the application status
        transaction.update(appRef, {
          status: action === "approve" ? "approved" : "declined",
          reviewedBy: context.auth!.uid,
          reviewedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true, applicationId, action };
      });
    } catch (error) {
      const err = error as Error;
      console.error("[reviewApplication] Error reviewing application:", err);
      // Let existing HttpsError pass through
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError(
        "internal",
        err.message || "An unexpected error occurred during application review."
      );
    }
  });

interface GetProducerProfileData {
  producerId: string;
}

/**
 * Cloud Function HTTPS Callable: getProducerProfile
 * Public endpoint to fetch a producer's public profile data and their published beats.
 */
export const getProducerProfile = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .https.onCall(async (data: unknown) => {
    const { producerId } = (data || {}) as GetProducerProfileData;

    if (!producerId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a 'producerId'."
      );
    }

    const db = getFirestore(admin.app(), "tape-garden-db");

    try {
      // 1. Fetch the producer profile
      const userDoc = await db.collection("users").doc(producerId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Producer not found.");
      }

      const userData = userDoc.data()!;
      if (userData.role !== "producer" || userData.producerProfile?.status !== "approved") {
        throw new functions.https.HttpsError("not-found", "Producer not found or not approved.");
      }

      // 2. Fetch published beats
      const beatsSnapshot = await db.collection("beats")
        .where("producerId", "==", producerId)
        .where("status", "==", "published")
        .orderBy("createdAt", "desc")
        .get();

      const beats = beatsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        profile: {
          displayName: userData.displayName,
          bio: userData.producerProfile?.bio || "",
          avatarUrl: userData.producerProfile?.avatarUrl || "",
          socialLinks: userData.producerProfile?.socialLinks || [],
        },
        beats,
      };
    } catch (error) {
      const err = error as Error;
      console.error("[getProducerProfile] Error fetching producer profile:", err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred while fetching the profile."
      );
    }
  });

interface PublishBeatData {
  uploadId: string;
  metadata: {
    title: string;
    bpm: number;
    key: string;
    tags: string[];
    licenses: {
      type: string;
      price: number;
      audioPreviewFile: string;
      stemFile: string;
    }[];
  };
}

/**
 * Cloud Function HTTPS Callable: publishBeat
 * Finalizes the beat upload flow by moving files from staging to canonical storage paths,
 * verifying slot limits, and creating the final document in Firestore.
 */
export const publishBeat = functions
  .region("us-east4")
  .runWith({ maxInstances: 10, timeoutSeconds: 300, memory: "512MB" })
  .https.onCall(async (data: unknown, context) => {
    // 1. Authenticate user
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "You must be logged in to publish a beat.");
    }
    const uid = context.auth.uid;

    if (!context.auth.token.producer) {
      throw new functions.https.HttpsError("permission-denied", "Only approved producers can publish beats.");
    }

    const { uploadId, metadata } = (data || {}) as PublishBeatData;

    if (!uploadId || !metadata || !metadata.title || !metadata.licenses || metadata.licenses.length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields to publish beat.");
    }

    const db = getFirestore(admin.app(), "tape-garden-db");
    const storage = getStorage(admin.app());
    // Get default bucket or the emulator one
    const bucket = storage.bucket();

    try {
      // 2. Fetch producer profile to check slots
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Producer profile not found.");
      }

      const userData = userDoc.data();
      const producerProfile = userData?.producerProfile;

      if (!producerProfile || producerProfile.status !== "approved") {
        throw new functions.https.HttpsError("permission-denied", "Producer is not approved.");
      }

      const allocatedSlots = producerProfile.allocatedBeatSlots || 0;

      // 3. Check consumed slots count (published + draft)
      const beatsQuery = db.collection("beats")
        .where("producerId", "==", uid)
        .where("status", "in", ["published", "draft"]);
      const beatsSnapshot = await beatsQuery.count().get();
      const consumedSlotsCount = beatsSnapshot.data().count;

      if (consumedSlotsCount >= allocatedSlots) {
        throw new functions.https.HttpsError("resource-exhausted", "You have reached your catalog slot limit. Cannot upload new beat.");
      }

      // 4. Validate files and move them from staging to canonical path
      // Generate a new beat ID
      const newBeatRef = db.collection("beats").doc();
      const beatId = newBeatRef.id;

      // We expect the frontend to tell us the names of the files in the staging folder.
      const stagingPrefix = `uploads-staging/${uid}/${uploadId}/`;

      let audioPreviewUrl = "";
      const finalLicenses = [];

      for (const license of metadata.licenses) {
        // Move preview
        const previewSrcPath = `${stagingPrefix}${license.audioPreviewFile}`;
        const previewDestPath = `previews/beats/${beatId}/${license.audioPreviewFile}`;

        const previewSrcFile = bucket.file(previewSrcPath);
        const [previewExists] = await previewSrcFile.exists();
        if (!previewExists) {
          throw new functions.https.HttpsError("failed-precondition", `Staging file missing: ${previewSrcPath}`);
        }

        // Check size: 100MB max
        const [previewMetadata] = await previewSrcFile.getMetadata();
        if (Number(previewMetadata.size) > 100 * 1024 * 1024) {
          throw new functions.https.HttpsError("invalid-argument", "Preview file exceeds 100MB limit.");
        }

        // Move preview file
        await previewSrcFile.move(previewDestPath);

        // Save preview url (assuming it's public)
        audioPreviewUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(previewDestPath)}?alt=media`;

        // Move stems
        const stemsSrcPath = `${stagingPrefix}${license.stemFile}`;
        const stemsDestPath = `purchased/beats/${beatId}/${license.type}/${license.stemFile}`;

        const stemsSrcFile = bucket.file(stemsSrcPath);
        const [stemsExists] = await stemsSrcFile.exists();
        if (!stemsExists) {
          throw new functions.https.HttpsError("failed-precondition", `Staging file missing: ${stemsSrcPath}`);
        }

        // Check size: 500MB max
        const [stemsFileMeta] = await stemsSrcFile.getMetadata();
        if (Number(stemsFileMeta.size) > 500 * 1024 * 1024) {
          throw new functions.https.HttpsError("invalid-argument", "Stems file exceeds 500MB limit.");
        }

        await stemsSrcFile.move(stemsDestPath);

        finalLicenses.push({
          type: license.type,
          price: license.price,
          fileUrl: stemsDestPath, // store internal path
        });
      }

      // 5. Create Firestore document
      await newBeatRef.set({
        producerId: uid,
        title: metadata.title,
        bpm: metadata.bpm || null,
        key: metadata.key || "",
        tags: metadata.tags || [],
        status: "published",
        audioPreviewUrl: audioPreviewUrl,
        licenses: finalLicenses,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Attempt to clean up staging folder if there are any remnants, 
      // but typically we can rely on a TTL policy or cron job in production.
      try {
        await bucket.deleteFiles({ prefix: stagingPrefix });
      } catch (err) {
        console.warn(`Could not completely clean up staging directory: ${stagingPrefix}`, err);
      }

      return { success: true, beatId };

    } catch (error) {
      const err = error as Error;
      console.error("[publishBeat] Error:", err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", err.message || "An unexpected error occurred.");
    }
  });

/**
 * Cloud Function HTTPS Callable: getAdminProducers
 * Admin-only endpoint to list all producers with their upload counts.
 */
export const getAdminProducers = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth || (context.auth.token.role !== "admin" && !context.auth.token.admin)) {
      throw new functions.https.HttpsError("permission-denied", "Only admins can view producers.");
    }

    const db = getFirestore(admin.app(), "tape-garden-db");
    
    try {
      const usersSnap = await db.collection("users").where("role", "==", "producer").get();
      
      const producers = await Promise.all(usersSnap.docs.map(async (doc) => {
        const userData = doc.data();
        
        // Count published beats
        const beatsSnap = await db.collection("beats")
          .where("producerId", "==", doc.id)
          .where("status", "==", "published")
          .count().get();
          
        // Count published sample packs
        const packsSnap = await db.collection("samplePacks")
          .where("producerId", "==", doc.id)
          .where("status", "==", "published")
          .count().get();

        return {
          uid: doc.id,
          email: userData.email,
          displayName: userData.displayName,
          createdAt: userData.createdAt,
          producerProfile: userData.producerProfile || {},
          stats: {
            publishedBeatsCount: beatsSnap.data().count,
            publishedSamplePacksCount: packsSnap.data().count
          }
        };
      }));

      return { producers };
    } catch (error) {
      console.error("[getAdminProducers] Error:", error);
      throw new functions.https.HttpsError("internal", "Failed to fetch producers");
    }
  });

interface UpdateProducerAccountData {
  producerId: string;
  status: "approved" | "suspended" | "pending" | "declined";
  allocatedBeatSlots: number;
  allocatedSamplePackSlots: number;
}

/**
 * Cloud Function HTTPS Callable: updateProducerAccount
 * Admin-only endpoint to modify producer slots or suspend their account.
 */
export const updateProducerAccount = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth || (context.auth.token.role !== "admin" && !context.auth.token.admin)) {
      throw new functions.https.HttpsError("permission-denied", "Only admins can update producers.");
    }

    const { producerId, status, allocatedBeatSlots, allocatedSamplePackSlots } = (data || {}) as UpdateProducerAccountData;

    if (!producerId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing producerId");
    }

    const db = getFirestore(admin.app(), "tape-garden-db");
    const userRef = db.collection("users").doc(producerId);

    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Producer not found.");
        }

        const userData = userDoc.data()!;
        if (userData.role !== "producer") {
          throw new functions.https.HttpsError("failed-precondition", "User is not a producer.");
        }

        const currentProfile = userData.producerProfile || {};
        const oldStatus = currentProfile.status;

        // Perform status transition logic
        if (oldStatus !== status) {
          if (status === "suspended") {
            // Disable Auth
            await admin.auth().updateUser(producerId, { disabled: true });

            // Query items to soft delete
            const beatsQuery = await db.collection("beats")
              .where("producerId", "==", producerId)
              .where("status", "==", "published")
              .get();
              
            beatsQuery.forEach((doc) => {
              transaction.update(doc.ref, { status: "suspended", updatedAt: FieldValue.serverTimestamp() });
            });

            const packsQuery = await db.collection("samplePacks")
              .where("producerId", "==", producerId)
              .where("status", "==", "published")
              .get();

            packsQuery.forEach((doc) => {
              transaction.update(doc.ref, { status: "suspended", updatedAt: FieldValue.serverTimestamp() });
            });

          } else if (oldStatus === "suspended" && status === "approved") {
            // Re-enable Auth
            await admin.auth().updateUser(producerId, { disabled: false });

            // Restore items to hidden instead of published
            const beatsQuery = await db.collection("beats")
              .where("producerId", "==", producerId)
              .where("status", "==", "suspended")
              .get();
              
            beatsQuery.forEach((doc) => {
              transaction.update(doc.ref, { status: "hidden", updatedAt: FieldValue.serverTimestamp() });
            });

            const packsQuery = await db.collection("samplePacks")
              .where("producerId", "==", producerId)
              .where("status", "==", "suspended")
              .get();

            packsQuery.forEach((doc) => {
              transaction.update(doc.ref, { status: "hidden", updatedAt: FieldValue.serverTimestamp() });
            });
          }
        }

        // Update User Doc
        transaction.update(userRef, {
          "producerProfile.status": status !== undefined ? status : currentProfile.status,
          "producerProfile.allocatedBeatSlots": allocatedBeatSlots !== undefined ? allocatedBeatSlots : currentProfile.allocatedBeatSlots,
          "producerProfile.allocatedSamplePackSlots": allocatedSamplePackSlots !== undefined ? allocatedSamplePackSlots : currentProfile.allocatedSamplePackSlots,
        });
      });

      return { success: true };
    } catch (error) {
      console.error("[updateProducerAccount] Error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError("internal", "An error occurred while updating the producer account.");
    }
  });

interface DeleteBeatData {
  beatId: string;
}

/**
 * Cloud Function HTTPS Callable: deleteBeat
 * Deletes a beat (hard delete if no purchases, soft delete if purchases exist).
 */
export const deleteBeat = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "You must be logged in to delete a beat.");
    }
    const uid = context.auth.uid;
    const { beatId } = (data || {}) as DeleteBeatData;

    if (!beatId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing beatId.");
    }

    const db = getFirestore(admin.app(), "tape-garden-db");
    const storage = getStorage(admin.app());
    const bucket = storage.bucket();

    try {
      const beatRef = db.collection("beats").doc(beatId);
      const beatDoc = await beatRef.get();

      if (!beatDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Beat not found.");
      }

      const beatData = beatDoc.data()!;
      if (beatData.producerId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "You can only delete your own beats.");
      }

      // Check for purchases
      const purchasesQuery = db.collection("purchases")
        .where("itemId", "==", beatId)
        .where("itemType", "==", "beat");
      
      const purchasesSnap = await purchasesQuery.limit(1).get();

      if (!purchasesSnap.empty) {
        // Soft delete
        await beatRef.update({
          status: "removed",
          updatedAt: FieldValue.serverTimestamp()
        });
        return { success: true, type: "soft" };
      } else {
        // Hard delete
        // Delete files from Storage
        const prefixPreview = `previews/beats/${beatId}/`;
        const prefixPurchased = `purchased/beats/${beatId}/`;

        try {
          await bucket.deleteFiles({ prefix: prefixPreview });
        } catch (err) {
          console.warn(`[deleteBeat] Could not clean up preview directory: ${prefixPreview}`, err);
        }
        
        try {
          await bucket.deleteFiles({ prefix: prefixPurchased });
        } catch (err) {
          console.warn(`[deleteBeat] Could not clean up purchased directory: ${prefixPurchased}`, err);
        }

        // Delete Firestore document
        await beatRef.delete();
        return { success: true, type: "hard" };
      }
    } catch (error) {
      const err = error as Error;
      console.error("[deleteBeat] Error:", err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", err.message || "An error occurred while deleting the beat.");
    }
  });

/**
 * Cloud Function Trigger: onPurchaseCreated
 * Automatically executes when a new purchase document is created.
 * Aggregates purchase data into ProducerSalesSummary and AdminSalesSummary.
 */
export const onPurchaseCreatedHandler = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .firestore
  .document("purchases/{purchaseId}")
  .onCreate(async (snap, context) => {
    const purchaseData = snap.data();
    if (!purchaseData) return;

    // Optional safety guard in case 'pending' purchases are recorded.
    if (purchaseData.status !== "completed") {
      console.log(`[onPurchaseCreated] Purchase ${context.params.purchaseId} is not completed. Skipping aggregation.`);
      return;
    }

    const { producerId, price, platformFee, producerPayout } = purchaseData;
    if (!producerId) return;

    const db = getFirestore(admin.app(), "tape-garden-db");
    
    // We aggregate by period (YYYY-MM) and 'all-time'
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    
    const producerSummaryRef = db.collection("producerSalesSummary").doc(`${producerId}_${period}`);
    const adminSummaryPeriodRef = db.collection("adminSalesSummary").doc(period);
    const adminSummaryAllTimeRef = db.collection("adminSalesSummary").doc("all-time");

    try {
      await db.runTransaction(async (transaction) => {
        // Update Producer Summary (YYYY-MM)
        const prodDoc = await transaction.get(producerSummaryRef);
        if (prodDoc.exists) {
          transaction.update(producerSummaryRef, {
            totalTransactions: FieldValue.increment(1),
            totalRevenue: FieldValue.increment(producerPayout || 0),
            updatedAt: FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(producerSummaryRef, {
            id: `${producerId}_${period}`,
            producerId: producerId,
            period: period,
            totalTransactions: 1,
            totalRevenue: producerPayout || 0,
            updatedAt: FieldValue.serverTimestamp()
          });
        }

        // Update Admin Summary (YYYY-MM)
        const adminPeriodDoc = await transaction.get(adminSummaryPeriodRef);
        if (adminPeriodDoc.exists) {
          transaction.update(adminSummaryPeriodRef, {
            totalTransactions: FieldValue.increment(1),
            totalRevenue: FieldValue.increment(price || 0),
            totalPlatformFees: FieldValue.increment(platformFee || 0),
            updatedAt: FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(adminSummaryPeriodRef, {
            id: period,
            totalTransactions: 1,
            totalRevenue: price || 0,
            totalPlatformFees: platformFee || 0,
            updatedAt: FieldValue.serverTimestamp()
          });
        }

        // Update Admin Summary (All-Time)
        const adminAllTimeDoc = await transaction.get(adminSummaryAllTimeRef);
        if (adminAllTimeDoc.exists) {
          transaction.update(adminSummaryAllTimeRef, {
            totalTransactions: FieldValue.increment(1),
            totalRevenue: FieldValue.increment(price || 0),
            totalPlatformFees: FieldValue.increment(platformFee || 0),
            updatedAt: FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(adminSummaryAllTimeRef, {
            id: "all-time",
            totalTransactions: 1,
            totalRevenue: price || 0,
            totalPlatformFees: platformFee || 0,
            updatedAt: FieldValue.serverTimestamp()
          });
        }
      });
      console.log(`[onPurchaseCreated] Successfully aggregated purchase ${context.params.purchaseId}`);
    } catch (error) {
      console.error(`[onPurchaseCreated] Error aggregating purchase ${context.params.purchaseId}:`, error);
      throw error;
    }
  });
