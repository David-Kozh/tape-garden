import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize the Firebase Admin SDK if it hasn't been initialized yet
if (!getApps().length) {
  initializeApp(); // Let Firebase App Hosting and GOOGLE_APPLICATION_CREDENTIALS auto-discover the config
}

export const adminDb = getFirestore("tape-garden-db");
export const adminAuth = getAuth();
