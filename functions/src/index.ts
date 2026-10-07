import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import { Resend } from "resend";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const resendApiKey = defineSecret("RESEND_API_KEY");

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
  .runWith({ maxInstances: 10, secrets: [resendApiKey] })
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

          // Generate password reset link for new or existing users to set their password
          let resetLink = "";
          try {
            resetLink = await admin.auth().generatePasswordResetLink(email);
          } catch (e) {
            console.error(`[reviewApplication] Could not generate reset link for ${email}`, e);
          }

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

          console.log(`[reviewApplication] Sending approval email to ${email}.`);
          try {
            const resend = new Resend(resendApiKey.value());
            await resend.emails.send({
              from: "onboarding@resend.dev",
              to: email,
              subject: "Welcome to Tape Garden",
              html: `<p>Hi ${displayName},</p><p>Your producer application for Tape Garden has been approved.</p><p>To get started, please <a href="${resetLink}">set your password</a> to log in and set up Stripe Connect.</p>`
            });
          } catch (e) {
            console.error("[reviewApplication] Failed to send approval email:", e);
          }
        } else {
          console.log(`[reviewApplication] Sending decline email to ${email}.`);
          try {
            const resend = new Resend(resendApiKey.value());
            await resend.emails.send({
              from: "onboarding@resend.dev",
              to: email,
              subject: "Update on your Tape Garden Application",
              html: `<p>Hi ${displayName},</p><p>Thank you for applying to Tape Garden. Unfortunately, we are unable to accept your application at this time.</p><p>We appreciate your interest and encourage you to re-apply in the future.</p>`
            });
          } catch (e) {
            console.error("[reviewApplication] Failed to send decline email:", e);
          }
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
          backgroundPattern: userData.producerProfile?.backgroundPattern || "none",
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
      const stagingPrefix = `uploads-staging/${uid}/beats/${uploadId}/`;

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

interface PublishSamplePackData {
  uploadId: string;
  metadata: {
    title: string;
    description: string;
    tags: string[];
    price: number;
    audioPreviewFile: string;
    archiveFile: string;
  };
}

/**
 * Cloud Function HTTPS Callable: publishSamplePack
 * Finalizes the sample pack upload flow by moving files from staging to canonical storage paths,
 * verifying slot limits, and creating the final document in Firestore.
 */
export const publishSamplePack = functions
  .region("us-east4")
  .runWith({ maxInstances: 10, timeoutSeconds: 300, memory: "512MB" })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "You must be logged in to publish a sample pack.");
    }
    const uid = context.auth.uid;

    if (!context.auth.token.producer) {
      throw new functions.https.HttpsError("permission-denied", "Only approved producers can publish sample packs.");
    }

    const { uploadId, metadata } = (data || {}) as PublishSamplePackData;

    if (!uploadId || !metadata || !metadata.title || !metadata.price || !metadata.audioPreviewFile || !metadata.archiveFile) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields to publish sample pack.");
    }

    const db = getFirestore(admin.app(), "tape-garden-db");
    const storage = getStorage(admin.app());
    const bucket = storage.bucket();

    try {
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

      const allocatedSlots = producerProfile.allocatedSamplePackSlots || 0;

      const packsQuery = db.collection("samplePacks")
        .where("producerId", "==", uid)
        .where("status", "in", ["published", "draft"]);
      const packsSnapshot = await packsQuery.count().get();
      const consumedSlotsCount = packsSnapshot.data().count;

      if (consumedSlotsCount >= allocatedSlots) {
        throw new functions.https.HttpsError("resource-exhausted", "You have reached your sample pack slot limit.");
      }

      const newPackRef = db.collection("samplePacks").doc();
      const packId = newPackRef.id;

      const stagingPrefix = `uploads-staging/${uid}/sample-packs/${uploadId}/`;

      // Move preview
      const previewSrcPath = `${stagingPrefix}${metadata.audioPreviewFile}`;
      const previewDestPath = `previews/sample-packs/${packId}/${metadata.audioPreviewFile}`;

      const previewSrcFile = bucket.file(previewSrcPath);
      const [previewExists] = await previewSrcFile.exists();
      if (!previewExists) {
        throw new functions.https.HttpsError("failed-precondition", `Staging preview file missing: ${previewSrcPath}`);
      }

      await previewSrcFile.move(previewDestPath);
      const audioPreviewUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(previewDestPath)}?alt=media`;

      // Move archive
      const archiveSrcPath = `${stagingPrefix}${metadata.archiveFile}`;
      const archiveDestPath = `purchased/sample-packs/${packId}/${metadata.archiveFile}`;

      const archiveSrcFile = bucket.file(archiveSrcPath);
      const [archiveExists] = await archiveSrcFile.exists();
      if (!archiveExists) {
        throw new functions.https.HttpsError("failed-precondition", `Staging archive file missing: ${archiveSrcPath}`);
      }

      await archiveSrcFile.move(archiveDestPath);

      // Create Firestore document
      await newPackRef.set({
        producerId: uid,
        title: metadata.title,
        description: metadata.description || "",
        tags: metadata.tags || [],
        price: metadata.price,
        status: "published",
        audioPreviewUrl: audioPreviewUrl,
        fileUrl: archiveDestPath,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      try {
        await bucket.deleteFiles({ prefix: stagingPrefix });
      } catch (err) {
        console.warn(`Could not completely clean up staging directory: ${stagingPrefix}`, err);
      }

      return { success: true, packId };

    } catch (error) {
      const err = error as Error;
      console.error("[publishSamplePack] Error:", err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", err.message || "An unexpected error occurred.");
    }
  });

interface DeleteSamplePackData {
  packId: string;
}

/**
 * Cloud Function HTTPS Callable: deleteSamplePack
 * Deletes a sample pack (hard delete if no purchases, soft delete if purchases exist).
 */
export const deleteSamplePack = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "You must be logged in to delete a sample pack.");
    }
    const uid = context.auth.uid;
    const { packId } = (data || {}) as DeleteSamplePackData;

    if (!packId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing packId.");
    }

    const db = getFirestore(admin.app(), "tape-garden-db");
    const storage = getStorage(admin.app());
    const bucket = storage.bucket();

    try {
      const packRef = db.collection("samplePacks").doc(packId);
      const packDoc = await packRef.get();

      if (!packDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Sample pack not found.");
      }

      const packData = packDoc.data()!;
      if (packData.producerId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "You can only delete your own sample packs.");
      }

      // Check for purchases
      const purchasesQuery = db.collection("purchases")
        .where("itemId", "==", packId)
        .where("itemType", "==", "samplePack");

      const purchasesSnap = await purchasesQuery.limit(1).get();

      if (!purchasesSnap.empty) {
        // Soft delete (Matches 'hidden' or 'removed' depending on schema, we use 'hidden' to be consistent with Beat)
        await packRef.update({
          status: "hidden",
          updatedAt: FieldValue.serverTimestamp()
        });
        return { success: true, type: "soft" };
      } else {
        // Hard delete
        const prefixPreview = `previews/sample-packs/${packId}/`;
        const prefixPurchased = `purchased/sample-packs/${packId}/`;

        try {
          await bucket.deleteFiles({ prefix: prefixPreview });
        } catch (err) {
          console.warn("[deleteSamplePack] Could not clean up preview directory", err);
        }

        try {
          await bucket.deleteFiles({ prefix: prefixPurchased });
        } catch (err) {
          console.warn("[deleteSamplePack] Could not clean up purchased directory", err);
        }

        await packRef.delete();
        return { success: true, type: "hard" };
      }
    } catch (error) {
      const err = error as Error;
      console.error("[deleteSamplePack] Error:", err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError("internal", err.message || "An error occurred while deleting the sample pack.");
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
  .database("tape-garden-db")
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
        // 1. Perform all reads first
        const prodDoc = await transaction.get(producerSummaryRef);
        const adminPeriodDoc = await transaction.get(adminSummaryPeriodRef);
        const adminAllTimeDoc = await transaction.get(adminSummaryAllTimeRef);

        // 2. Perform all writes
        // Update Producer Summary (YYYY-MM)
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

interface GenerateDownloadUrlData {
  purchaseId: string;
}

/**
 * Cloud Function HTTPS Callable: generateDownloadUrl
 * Generates a time-limited pre-signed URL for a purchased item.
 */
export const generateDownloadUrl = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "You must be logged in to download items.");
    }
    const uid = context.auth.uid;
    const { purchaseId } = (data || {}) as GenerateDownloadUrlData;

    if (!purchaseId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing purchaseId.");
    }

    const db = getFirestore(admin.app(), "tape-garden-db");
    const storage = getStorage(admin.app());
    const bucket = storage.bucket();

    try {
      // 1. Fetch purchase and check ownership
      const purchaseRef = db.collection("purchases").doc(purchaseId);
      const purchaseDoc = await purchaseRef.get();

      if (!purchaseDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Purchase not found.");
      }

      const purchaseData = purchaseDoc.data()!;
      if (purchaseData.buyerId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "You do not own this purchase.");
      }
      if (purchaseData.status !== "completed") {
        throw new functions.https.HttpsError("failed-precondition", "Purchase is not completed.");
      }

      // 2. Rate limiting check (max 3 per hour for now)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const downloadLogsQuery = await db.collection("downloadLogs")
        .where("buyerId", "==", uid)
        .where("timestamp", ">=", oneHourAgo)
        .count()
        .get();

      if (downloadLogsQuery.data().count >= 3) {
        throw new functions.https.HttpsError("resource-exhausted", "Rate limit exceeded. Please try again later.");
      }

      // 3. Resolve the file URL
      let fileUrl = "";
      if (purchaseData.itemType === "beat") {
        const beatDoc = await db.collection("beats").doc(purchaseData.itemId).get();
        if (!beatDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Purchased beat not found.");
        }
        const beatData = beatDoc.data()!;
        const license = beatData.licenses?.find((l: { type: string; fileUrl: string; }) => l.type === purchaseData.licenseType);
        if (!license || !license.fileUrl) {
          throw new functions.https.HttpsError("not-found", "Beat license file not found.");
        }
        fileUrl = license.fileUrl;
      } else if (purchaseData.itemType === "samplePack") {
        const packDoc = await db.collection("samplePacks").doc(purchaseData.itemId).get();
        if (!packDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Purchased sample pack not found.");
        }
        const packData = packDoc.data()!;
        if (!packData.fileUrl) {
          throw new functions.https.HttpsError("not-found", "Sample pack file not found.");
        }
        fileUrl = packData.fileUrl;
      } else {
        throw new functions.https.HttpsError("invalid-argument", "Unknown itemType.");
      }

      // 4. Generate signed URL
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      const [downloadUrl] = await bucket.file(fileUrl).getSignedUrl({
        action: "read",
        expires: expiresAt,
      });

      // 5. Log the download
      await db.collection("downloadLogs").add({
        purchaseId,
        buyerId: uid,
        itemId: purchaseData.itemId,
        itemType: purchaseData.itemType,
        timestamp: FieldValue.serverTimestamp(),
      });

      return {
        downloadUrl,
        expiresAt,
      };

    } catch (error) {
      console.error("[generateDownloadUrl] Error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError("internal", "An error occurred generating the download link.");
    }
  });

/**
 * Cloud Function HTTPS Callable: createStripeConnectAccount
 * Creates an Express account for a producer and returns an onboarding URL.
 * 
 * Testing required.
 * 
 */
export const createStripeConnectAccount = functions
  .region("us-east4")
  .runWith({ secrets: [stripeSecretKey] })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth || !context.auth.token.producer) {
      throw new functions.https.HttpsError("permission-denied", "Only producers can connect Stripe.");
    }
    const uid = context.auth.uid;
    const db = getFirestore(admin.app(), "tape-garden-db");

    try {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found.");
      }

      const userData = userDoc.data()!;
      let stripeAccountId = userData.stripeAccountId;

      const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2026-09-30.endive" });

      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: "express",
          email: userData.email,
        });
        stripeAccountId = account.id;

        await userRef.update({
          stripeAccountId: stripeAccountId,
          "producerProfile.stripeStatus": "pending",
        });
      }

      // Generate account link
      const dataOrigin = (data as Record<string, unknown>)?.origin as string | undefined;
      if (!dataOrigin) {
        throw new functions.https.HttpsError("invalid-argument", "The 'origin' parameter is required.");
      }
      const origin = dataOrigin;
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/dashboard/settings?stripe=refresh`,
        return_url: `${origin}/dashboard/settings?stripe=return`,
        type: "account_onboarding",
      });

      return { url: accountLink.url };
    } catch (error) {
      console.error("[createStripeConnectAccount] Error:", error);
      throw new functions.https.HttpsError("internal", "An error occurred creating Stripe Connect account.");
    }
  });

/**
 * Cloud Function HTTPS Callable: getStripeDashboardLink
 * Returns a login link to the producer's Express dashboard.
 * 
 * Testing required.
 * 
 */
export const getStripeDashboardLink = functions
  .region("us-east4")
  .runWith({ secrets: [stripeSecretKey] })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth || !context.auth.token.producer) {
      throw new functions.https.HttpsError("permission-denied", "Only producers can view Stripe dashboard.");
    }
    const uid = context.auth.uid;
    const db = getFirestore(admin.app(), "tape-garden-db");

    try {
      const userDoc = await db.collection("users").doc(uid).get();
      const stripeAccountId = userDoc.data()?.stripeAccountId;

      if (!stripeAccountId) {
        throw new functions.https.HttpsError("failed-precondition", "Stripe account not connected.");
      }

      const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2026-09-30.endive" });
      const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

      return { url: loginLink.url };
    } catch (error) {
      console.error("[getStripeDashboardLink] Error:", error);
      throw new functions.https.HttpsError("internal", "An error occurred fetching Stripe dashboard link.");
    }
  });

/**
 * Cloud Function HTTPS Callable: verifyStripeAccount
 * Manually checks the status of a Stripe Connect account.
 */
export const verifyStripeAccount = functions
  .region("us-east4")
  .runWith({ secrets: [stripeSecretKey] })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth || !context.auth.token.producer) {
      throw new functions.https.HttpsError("permission-denied", "Only producers can verify Stripe account.");
    }
    const uid = context.auth.uid;
    const db = getFirestore(admin.app(), "tape-garden-db");

    try {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if (!userData || !userData.stripeAccountId) {
        return { status: "not_connected" };
      }

      const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2026-09-30.endive" });
      const account = await stripe.accounts.retrieve(userData.stripeAccountId);

      if (account.details_submitted && account.payouts_enabled) {
        await userRef.update({
          "producerProfile.stripeStatus": "active"
        });
        return { status: "active" };
      } else {
        return { status: "pending" };
      }
    } catch (error) {
      console.error("[verifyStripeAccount] Error:", error);
      throw new functions.https.HttpsError("internal", "An error occurred verifying Stripe account.");
    }
  });

interface CartItem {
  itemId: string;
  itemType: "beat" | "samplePack";
  licenseType?: string; // only for beats
}

/**
 * Cloud Function HTTPS Callable: createCheckoutSession
 * Processes items from a multi-producer cart and creates a Stripe Checkout session
 * using Separate Charges and Transfers.
 * 
 * Testing required.
 * 
 */
export const createCheckoutSession = functions
  .region("us-east4")
  .runWith({ secrets: [stripeSecretKey] })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be logged in to checkout.");
    }
    const uid = context.auth.uid;
    const { items } = (data || {}) as { items: CartItem[] };

    if (!items || !items.length) {
      throw new functions.https.HttpsError("invalid-argument", "Cart is empty.");
    }

    const db = getFirestore(admin.app(), "tape-garden-db");
    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2026-09-30.endive" });

    try {
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
      const serializedCartItems = [];

      // Calculate totals and verify items securely
      for (const item of items) {
        if (item.itemType === "beat") {
          const beatDoc = await db.collection("beats").doc(item.itemId).get();
          if (!beatDoc.exists) continue;
          const beatData = beatDoc.data()!;

          // Verify producer stripe status
          const producerDoc = await db.collection("users").doc(beatData.producerId).get();
          const producerData = producerDoc.data()!;
          if (producerData.producerProfile?.stripeStatus !== "active") {
            throw new functions.https.HttpsError("failed-precondition", `Producer for beat ${beatData.title} cannot accept payments.`);
          }

          const license = beatData.licenses?.find((l: { type: string; price: number }) => l.type === item.licenseType);
          if (!license) continue;

          lineItems.push({
            price_data: {
              currency: "usd",
              product_data: {
                name: `${beatData.title} (${item.licenseType} License)`,
              },
              unit_amount: Math.round(license.price * 100),
            },
            quantity: 1,
          });

          serializedCartItems.push({
            itemId: item.itemId,
            itemType: "beat",
            licenseType: item.licenseType,
            producerId: beatData.producerId,
            producerStripeAccountId: producerData.stripeAccountId,
            price: license.price,
          });

        } else if (item.itemType === "samplePack") {
          const packDoc = await db.collection("samplePacks").doc(item.itemId).get();
          if (!packDoc.exists) continue;
          const packData = packDoc.data()!;

          const producerDoc = await db.collection("users").doc(packData.producerId).get();
          const producerData = producerDoc.data()!;
          if (producerData.producerProfile?.stripeStatus !== "active") {
            throw new functions.https.HttpsError("failed-precondition", `Producer for sample pack ${packData.title} cannot accept payments.`);
          }

          lineItems.push({
            price_data: {
              currency: "usd",
              product_data: {
                name: packData.title,
              },
              unit_amount: Math.round(packData.price * 100),
            },
            quantity: 1,
          });

          serializedCartItems.push({
            itemId: item.itemId,
            itemType: "samplePack",
            producerId: packData.producerId,
            producerStripeAccountId: producerData.stripeAccountId,
            price: packData.price,
          });
        }
      }

      if (lineItems.length === 0) {
        throw new functions.https.HttpsError("failed-precondition", "No valid items in cart.");
      }

      const transferGroup = `cart_${Math.random().toString(36).substring(2, 15)}`;
      const dataOrigin = (data as Record<string, unknown>)?.origin as string | undefined;
      if (!dataOrigin) {
        throw new functions.https.HttpsError("invalid-argument", "The 'origin' parameter is required.");
      }
      const origin = dataOrigin;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cart`,
        payment_intent_data: {
          transfer_group: transferGroup,
        },
        metadata: {
          buyerId: uid,
          transferGroup: transferGroup,
          cart: JSON.stringify(serializedCartItems),
        },
      });

      return { url: session.url };
    } catch (error) {
      console.error("[createCheckoutSession] Error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError("internal", "Failed to create checkout session.");
    }
  });

/**
 * Cloud Function HTTPS Request: stripeWebhook
 * Handles Stripe events (Checkout complete, Account updated).
 * 
 * Testing required.
 * 
 */
export const stripeWebhook = functions
  .region("us-east4")
  .runWith({ secrets: [stripeSecretKey, stripeWebhookSecret, resendApiKey] })
  .https.onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = stripeWebhookSecret.value();
    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2026-09-30.endive" });

    let event: Stripe.Event;

    try {
      if (!sig) throw new Error("Missing signature");
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${(err as Error).message}`);
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      return;
    }

    const db = getFirestore(admin.app(), "tape-garden-db");

    try {
      if (event.type === "account.updated") {
        const account = event.data.object as Stripe.Account;
        if (account.details_submitted && account.payouts_enabled) {
          // Find the producer and update their status
          const usersSnap = await db.collection("users").where("stripeAccountId", "==", account.id).get();
          if (!usersSnap.empty) {
            await usersSnap.docs[0].ref.update({
              "producerProfile.stripeStatus": "active"
            });
            console.log(`[stripeWebhook] Producer ${usersSnap.docs[0].id} Stripe status set to active.`);
          }
        }
      }
      else if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status === "paid" && session.metadata?.cart) {
          const cart = JSON.parse(session.metadata.cart);
          const buyerId = session.metadata.buyerId;
          const transferGroup = session.metadata.transferGroup;

          // Retrieve payment intent to get the latest charge for source_transaction
          const paymentIntentId = session.payment_intent as string;
          let chargeId: string | undefined = undefined;

          if (paymentIntentId) {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
            chargeId = pi.latest_charge as string | undefined;
          }

          for (const item of cart) {
            const purchaseId = `${session.id}_${item.itemId}`;
            const purchaseRef = db.collection("purchases").doc(purchaseId);

            const doc = await purchaseRef.get();
            if (!doc.exists) {
              // Calculate split
              const platformFee = item.price * 0.10;
              const producerPayout = item.price * 0.90;

              // Execute transfer idempotently
              const transferParams: Stripe.TransferCreateParams = {
                amount: Math.round(producerPayout * 100),
                currency: "usd",
                destination: item.producerStripeAccountId,
                transfer_group: transferGroup,
              };

              // Use source_transaction to bypass available balance delays
              if (chargeId) {
                transferParams.source_transaction = chargeId;
              }

              const transfer = await stripe.transfers.create(transferParams, {
                idempotencyKey: `transfer_${purchaseId}`
              });

              await purchaseRef.set({
                buyerId,
                producerId: item.producerId,
                itemId: item.itemId,
                itemType: item.itemType,
                licenseType: item.licenseType || null,
                price: item.price,
                platformFee,
                producerPayout,
                currency: "usd",
                stripeSessionId: session.id,
                stripePaymentIntentId: paymentIntentId,
                stripeTransferId: transfer.id,
                status: "completed",
                payoutStatus: "paid",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }

          try {
            const buyerEmail = session.customer_details?.email;
            if (buyerEmail) {
              const resend = new Resend(resendApiKey.value());

              const itemsHtml = cart.map((item: { itemType: string; licenseType?: string; price: number }) => `<li>${item.itemType} ${item.licenseType ? `(${item.licenseType})` : ""} - $${item.price}</li>`).join("");

              await resend.emails.send({
                from: "onboarding@resend.dev",
                to: buyerEmail,
                subject: "Tape Garden Purchase Receipt",
                html: `<p>Thank you for your purchase.</p><ul>${itemsHtml}</ul><p>You can download your files anytime from your <a href="https://tapegarden--tape-garden.us-east4.hosted.app/dashboard/collection">purchases page</a>.</p>`
              });
              console.log(`[stripeWebhook] Sent purchase receipt to ${buyerEmail}`);
            }
          } catch (e) {
            console.error("[stripeWebhook] Failed to send receipt email:", e);
          }

          console.log(`[stripeWebhook] Checkout session ${session.id} fully processed.`);
        }
      }

      res.status(200).send({ received: true });
    } catch (error) {
      console.error(`[stripeWebhook] Error processing event ${event.id}:`, error);
      res.status(500).send("Internal Server Error");
    }
  });

/**
 * Scheduled Job: incrementUploadSlots
 * Runs at midnight UTC on the 1st of every month.
 * Grants +2 beat slots and +2 sample pack slots (up to a cap of 50) 
 * for all approved producers.
 */
export const incrementUploadSlots = functions
  .region("us-east4")
  .runWith({ maxInstances: 1, secrets: [resendApiKey] })
  .pubsub.schedule("0 0 1 * *")
  .timeZone("UTC")
  .onRun(async () => {
    console.log("[incrementUploadSlots] Starting monthly slot increment job.");
    const db = getFirestore(admin.app(), "tape-garden-db");

    try {
      const producersSnapshot = await db.collection("users")
        .where("role", "==", "producer")
        .where("producerProfile.status", "==", "approved")
        .get();

      if (producersSnapshot.empty) {
        console.log("[incrementUploadSlots] No approved producers found.");
        return null;
      }

      const now = admin.firestore.Timestamp.now();
      const currentMonthUTC = now.toDate().getUTCMonth();
      const currentYearUTC = now.toDate().getUTCFullYear();

      let batch = db.batch();
      let operationCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let cappedCount = 0;
      let failedBatchCount = 0;
      const emailsToSend: string[] = [];

      const commitBatch = async (currentBatch: admin.firestore.WriteBatch, count: number) => {
        try {
          await currentBatch.commit();
        } catch (error) {
          console.error("[incrementUploadSlots] Failed to commit a batch of", count, "updates:", error);
          failedBatchCount += count;
        }
      };

      for (const doc of producersSnapshot.docs) {
        const data = doc.data();
        const profile = data.producerProfile || {};

        // Idempotency: skip if already incremented this month
        let skip = false;
        if (profile.lastSlotIncrementDate) {
          // Field could be a Timestamp or Date depending on how it was written, usually Timestamp in Firestore
          const lastDateObj = profile.lastSlotIncrementDate.toDate ? profile.lastSlotIncrementDate.toDate() : new Date(profile.lastSlotIncrementDate);
          if (lastDateObj.getUTCMonth() === currentMonthUTC && lastDateObj.getUTCFullYear() === currentYearUTC) {
            skip = true;
          }
        }

        if (skip) {
          skippedCount++;
          continue;
        }

        const currentBeatSlots = profile.allocatedBeatSlots || 0;
        const currentPackSlots = profile.allocatedSamplePackSlots || 0;

        const calcNewSlots = (current: number) => {
          if (current >= 50) return current;
          return Math.min(current + 2, 50);
        };

        const finalBeatSlots = calcNewSlots(currentBeatSlots);
        const finalPackSlots = calcNewSlots(currentPackSlots);

        if (finalBeatSlots === currentBeatSlots && finalPackSlots === currentPackSlots) {
          cappedCount++;
          // Skip updating the date if we didn't actually increase slots
          continue;
        }

        batch.update(doc.ref, {
          "producerProfile.allocatedBeatSlots": finalBeatSlots,
          "producerProfile.allocatedSamplePackSlots": finalPackSlots,
          "producerProfile.lastSlotIncrementDate": now
        });

        if (data.email) {
          emailsToSend.push(data.email);
        }

        updatedCount++;
        operationCount++;

        if (operationCount === 500) {
          await commitBatch(batch, operationCount);
          batch = db.batch();
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        await commitBatch(batch, operationCount);
      }

      if (emailsToSend.length > 0) {
        const resend = new Resend(resendApiKey.value());
        const BATCH_SIZE = 100;
        for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
          const emailBatch = emailsToSend.slice(i, i + BATCH_SIZE);
          try {
            await resend.batch.send(emailBatch.map(email => ({
              from: "onboarding@resend.dev",
              to: email,
              subject: "New Upload Slots Available!",
              html: "<p>Great news! Your monthly upload slots have been refreshed.</p><p>Log in to Tape Garden to share your new sounds.</p>"
            })));
            console.log(`[incrementUploadSlots] Sent ${emailBatch.length} re-engagement emails.`);
          } catch (e) {
            console.error("[incrementUploadSlots] Failed to send re-engagement email batch:", e);
          }
        }
      }

      console.log(`[incrementUploadSlots] Job complete. Updated: ${updatedCount}, Skipped: ${skippedCount}, Capped: ${cappedCount}, Failed in batches: ${failedBatchCount}`);
      return null;
    } catch (error) {
      console.error("[incrementUploadSlots] Fatal error during slot increment:", error);
      return null;
    }
  });

interface GenerateInviteData {
  inviteeName: string;
}

/**
 * Cloud Function HTTPS Callable: generateInvite
 * Admin-only endpoint to generate a unique invite link token for a producer.
 */
export const generateInvite = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth || (context.auth.token.role !== "admin" && !context.auth.token.admin)) {
      throw new functions.https.HttpsError("permission-denied", "Only admins can generate invites.");
    }

    const { inviteeName } = (data || {}) as GenerateInviteData;
    if (!inviteeName || typeof inviteeName !== "string" || inviteeName.trim() === "") {
      throw new functions.https.HttpsError("invalid-argument", "Missing or invalid inviteeName.");
    }

    const db = getFirestore(admin.app(), "tape-garden-db");
    const invitesRef = db.collection("invites");

    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 60); // 60 days expiration

      const newInvite = await invitesRef.add({
        inviteeName: inviteeName.trim(),
        expirationTimestamp: admin.firestore.Timestamp.fromDate(expirationDate),
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        createdBy: context.auth.uid,
      });

      return { success: true, token: newInvite.id };
    } catch (error) {
      console.error("[generateInvite] Error:", error);
      throw new functions.https.HttpsError("internal", "An error occurred while generating the invite.");
    }
  });

interface ValidateInviteData {
  token: string;
}

/**
 * Cloud Function HTTPS Callable: validateInvite
 * Public endpoint to check if an invite token is valid and pending.
 */
export const validateInvite = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .https.onCall(async (data: unknown) => {
    const { token } = (data || {}) as ValidateInviteData;

    if (!token || typeof token !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Missing or invalid token.");
    }

    const db = getFirestore(admin.app(), "tape-garden-db");

    try {
      const inviteDoc = await db.collection("invites").doc(token).get();
      if (!inviteDoc.exists) {
        return { valid: false, reason: "not-found" };
      }

      const inviteData = inviteDoc.data()!;
      if (inviteData.status !== "pending") {
        return { valid: false, reason: "used-or-expired" };
      }

      const expiration = (inviteData.expirationTimestamp as admin.firestore.Timestamp).toDate();
      if (expiration < new Date()) {
        // Technically expired, but status might still be pending in DB
        return { valid: false, reason: "used-or-expired" };
      }

      return { valid: true, inviteeName: inviteData.inviteeName };
    } catch (error) {
      console.error("[validateInvite] Error:", error);
      throw new functions.https.HttpsError("internal", "An error occurred while validating the invite.");
    }
  });

interface AcceptInviteData {
  token: string;
  profileData?: {
    displayName?: string;
    bio?: string;
    photoURL?: string;
    socialLinks?: string[];
  };
}

/**
 * Cloud Function HTTPS Callable: acceptInvite
 * Endpoint for authenticated users to accept an invite, granting them producer status.
 */
export const acceptInvite = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .https.onCall(async (data: unknown, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "You must be logged in to accept an invite.");
    }

    const uid = context.auth.uid;
    const authEmail = context.auth.token.email || "";
    const authName = context.auth.token.name || "Anonymous";
    const { token, profileData } = (data || {}) as AcceptInviteData;

    if (!token || typeof token !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Missing or invalid token.");
    }

    const db = getFirestore(admin.app(), "tape-garden-db");
    const inviteRef = db.collection("invites").doc(token);
    const userRef = db.collection("users").doc(uid);

    try {
      await db.runTransaction(async (transaction) => {
        const inviteDoc = await transaction.get(inviteRef);
        if (!inviteDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Invite not found.");
        }

        const inviteData = inviteDoc.data()!;
        if (inviteData.status !== "pending") {
          throw new functions.https.HttpsError("failed-precondition", "Invite is no longer valid.");
        }

        const expiration = (inviteData.expirationTimestamp as admin.firestore.Timestamp).toDate();
        if (expiration < new Date()) {
          throw new functions.https.HttpsError("failed-precondition", "Invite has expired.");
        }

        // Get user doc (must happen before any writes)
        const userDoc = await transaction.get(userRef);

        // Mark invite as used
        transaction.update(inviteRef, {
          status: "used",
          usedBy: uid,
          usedAt: FieldValue.serverTimestamp(),
        });

        let producerProfile = {
          status: "approved",
          allocatedBeatSlots: 2,
          allocatedSamplePackSlots: 2,
          lastSlotIncrementDate: FieldValue.serverTimestamp(),
          bio: profileData?.bio || "",
          socialLinks: profileData?.socialLinks || [],
          avatarUrl: profileData?.photoURL || "",
        };

        if (userDoc.exists) {
          const userData = userDoc.data()!;
          // Merge existing profile data if they already had some
          const existingProfile = userData.producerProfile || {};
          producerProfile = {
            ...producerProfile,
            bio: profileData?.bio || existingProfile.bio || "",
            socialLinks: profileData?.socialLinks || existingProfile.socialLinks || [],
            avatarUrl: profileData?.photoURL || existingProfile.avatarUrl || "",
          };

          transaction.set(userRef, {
            role: "producer",
            displayName: profileData?.displayName || userData.displayName,
            producerProfile,
          }, { merge: true });
        } else {
          // If the user document doesn't exist yet
          transaction.set(userRef, {
            uid: uid,
            role: "producer",
            email: authEmail,
            displayName: profileData?.displayName || authName,
            createdAt: FieldValue.serverTimestamp(),
            stripeCustomerId: null,
            stripeAccountId: null,
            producerProfile,
          }, { merge: true });
        }
      });

      // After successful transaction, set custom claim
      await admin.auth().setCustomUserClaims(uid, {
        role: "producer",
        producer: true,
      });

      return { success: true };
    } catch (error) {
      console.error("[acceptInvite] Error:", error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError("internal", "An error occurred while accepting the invite.");
    }
  });
