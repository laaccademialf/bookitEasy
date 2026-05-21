import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const requiredEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingEnvKeys = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvKeys.length > 0) {
  throw new Error(
    `Missing Firebase env variables: ${missingEnvKeys.join(', ')}. Add them to .env.local and restart the dev server.`
  );
}

const firebaseConfig = {
  apiKey: requiredEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: requiredEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: requiredEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: requiredEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: requiredEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: requiredEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
