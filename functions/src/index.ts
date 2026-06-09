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

interface CreateProducerData {
  email: string;
  displayName: string;
  password?: string;
  bio?: string;
  socialLinks?: string[];
  avatarUrl?: string;
}

/**
 * Cloud Function HTTPS Callable: createProducerAccount
 * Admin-only provisioning tool for creating producer accounts.
 * Validates admin status, creates user in Firebase Auth, assigns custom claims,
 * and sets up the Firestore document in /users/{uid} with default producerProfile limits.
 */
export const createProducerAccount = functions
  .region("us-east4")
  .runWith({ maxInstances: 10 })
  .https.onCall(async (data: unknown, context) => {
    // 1. Verify that the caller is authenticated and has administrative privileges
    if (!context.auth || (context.auth.token.role !== "admin" && !context.auth.token.admin)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only authenticated administrators are authorized to provision producer accounts."
      );
    }

    const { email, displayName, password, bio, socialLinks, avatarUrl } = (data || {}) as CreateProducerData;

    // 2. Validate input fields
    if (!email || !displayName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Both 'email' and 'displayName' are required fields to provision a producer account."
      );
    }

    console.log(`[createProducerAccount] Provisioning producer account for: ${email}`);

    try {
      // 3. Retrieve or Create Identity Platform user account
      let uid: string;
      let isNewUser = false;
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        uid = userRecord.uid;
        console.log(`[createProducerAccount] Existing Firebase Auth user found with UID: ${uid}`);
      } catch (error) {
        const authErr = error as { code?: string };
        if (authErr.code === "auth/user-not-found") {
          const userRecord = await admin.auth().createUser({
            email,
            displayName,
            password: password || Math.random().toString(36).slice(-10) + "Prod!" + Math.random().toString(36).slice(-2).toUpperCase(),
          });
          uid = userRecord.uid;
          isNewUser = true;
          console.log(`[createProducerAccount] Firebase Auth user created with UID: ${uid}`);
        } else {
          throw error;
        }
      }

      // 4. Assign producer custom claims
      await admin.auth().setCustomUserClaims(uid, {
        role: "producer",
        producer: true,
      });
      console.log(`[createProducerAccount] Custom claims set on UID: ${uid}`);

      // 5. Provision or merge the users Firestore document
      const db = getFirestore(admin.app(), "tape-garden-db");
      const userRef = db.collection("users").doc(uid);
      
      const producerProfile = {
        status: "approved",
        allocatedBeatSlots: 2,
        allocatedSamplePackSlots: 2,
        lastSlotIncrementDate: FieldValue.serverTimestamp(),
        bio: bio || "",
        socialLinks: socialLinks || [],
        avatarUrl: avatarUrl || "",
      };

      if (isNewUser) {
        await userRef.set({
          uid: uid,
          role: "producer",
          email: email,
          displayName: displayName,
          createdAt: FieldValue.serverTimestamp(),
          stripeCustomerId: null,
          stripeAccountId: null,
          producerProfile: producerProfile,
        });
        console.log(`[createProducerAccount] Firestore users document created for UID: ${uid}`);
      } else {
        // Upgrade existing user by merging fields
        await userRef.set({
          role: "producer",
          producerProfile: producerProfile,
        }, { merge: true });
        console.log(`[createProducerAccount] Firestore users document merged/updated for UID: ${uid}`);
      }

      return { success: true, uid };
    } catch (error) {
      const err = error as Error;
      console.error("[createProducerAccount] Error provisioning producer account:", err);
      throw new functions.https.HttpsError(
        "internal",
        err.message || "An unexpected error occurred during producer account creation."
      );
    }
  });


