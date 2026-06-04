const admin = require("firebase-admin");

// Initialize Firebase Admin SDK using Application Default Credentials
// Ensure you have set the GOOGLE_APPLICATION_CREDENTIALS environment variable
// or run 'gcloud auth application-default login' before running this script.
admin.initializeApp();

const email = process.argv[2];

if (!email) {
  console.error("Error: Please provide a user email address.");
  console.log("Usage: node scripts/promote-to-admin.js <email>");
  process.exit(1);
}

async function promoteUserToAdmin() {
  console.log(`Locating user with email: ${email}...`);
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.displayName || "No Display Name"} (UID: ${user.uid})`);
    
    // Set custom claims
    console.log("Setting custom claims: { role: 'admin', admin: true }...");
    await admin.auth().setCustomUserClaims(user.uid, {
      role: "admin",
      admin: true
    });
    
    // Update the corresponding Firestore document in the /users collection
    console.log("Updating role in Firestore users collection...");
    const db = admin.firestore();
    await db.collection("users").doc(user.uid).update({
      role: "admin"
    });
    
    console.log(`Success: Successfully promoted user ${email} to Administrator.`);
  } catch (error) {
    console.error("Failed to promote user to Admin:", error);
    process.exit(1);
  }
}

promoteUserToAdmin();
