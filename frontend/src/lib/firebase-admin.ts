import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize the Firebase Admin SDK if it hasn't been initialized yet
if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    // In Firebase App Hosting, credentials are automatically discovered.
    // Locally, you must set GOOGLE_APPLICATION_CREDENTIALS in .env.local
  });
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
