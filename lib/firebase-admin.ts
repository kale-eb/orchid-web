import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let app: App | undefined;

function getApp(): App {
  if (getApps().length > 0) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || "{}";
  const serviceAccount = JSON.parse(raw);
  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: "orchid-c6d1d.firebasestorage.app",
  });
  return app;
}

export function getDb(): Firestore {
  return getFirestore(getApp());
}

export function getStorageBucket(): Storage {
  return getStorage(getApp());
}

export function getFcm(): Messaging {
  return getMessaging(getApp());
}
