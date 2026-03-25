import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const inferredAppspotBucket = firebaseConfig.projectId ? `${firebaseConfig.projectId}.appspot.com` : '';
const configuredStorageBucket = String(firebaseConfig.storageBucket || '').trim();
const shouldUseAppspotAlias = configuredStorageBucket.endsWith('.firebasestorage.app') && Boolean(inferredAppspotBucket);
const resolvedStorageBucket = shouldUseAppspotAlias
  ? inferredAppspotBucket
  : configuredStorageBucket || inferredAppspotBucket;

const requiredFirebaseConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: resolvedStorageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
};

// Measurement ID is optional and only required for Analytics.
const isFirebaseConfigured = Object.values(requiredFirebaseConfig).every(Boolean);

let app = null;
let auth = null;
let db = null;
let storage = null;
let analytics = null;

if (isFirebaseConfigured) {
  app = initializeApp({
    ...firebaseConfig,
    storageBucket: resolvedStorageBucket,
  });
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app, `gs://${resolvedStorageBucket}`);

  const hasMeasurementId = Boolean(firebaseConfig.measurementId);
  if (hasMeasurementId && typeof window !== 'undefined') {
    isAnalyticsSupported()
      .then((supported) => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      })
      .catch(() => {
        analytics = null;
      });
  }
}

export { app, auth, db, storage, analytics, firebaseConfig, isFirebaseConfigured };
