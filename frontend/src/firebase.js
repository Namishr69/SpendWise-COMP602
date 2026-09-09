import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Use localStorage instead of the default IndexedDB persistence.
// Firebase's IndexedDB-based session storage has a known issue where
// redirect-based sign-in (e.g. Google) can fail with "Database is
// closing/hidden" if a write is interrupted by the page navigating
// away/back too quickly. localStorage-based persistence avoids this
// entirely and is more than sufficient for our needs.
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set auth persistence:', error);
});