import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Cloud Function Trigger: onUserCreated
 * Automatically executes when a new user registers via Firebase Auth (Email/Password or Google).
 * Provisions the user document in Firestore with role: "buyer" and sets the custom JWT claims.
 */
export const onUserCreatedHandler = functions
  .runWith({maxInstances: 10})
  .auth.user()
  .onCreate(async (user) => {
    const {uid, email, displayName} = user;
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
      const db = admin.firestore();
      await db.collection("users").doc(uid).set({
        uid: uid,
        role: "buyer",
        email: finalEmail,
        displayName: finalDisplayName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeCustomerId: null,
      });
      console.log(`[onUserCreated] Successfully created Firestore users document for user: ${uid}`);
    } catch (error) {
      console.error(`[onUserCreated] Error provisioning user profile for ${uid}:`, error);
      throw error;
    }
  });

