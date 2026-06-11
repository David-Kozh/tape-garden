import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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
          status: action,
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
