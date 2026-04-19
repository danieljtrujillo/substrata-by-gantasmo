import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DB_ID;

const FIREBASE_AVAILABLE = !!firebaseConfig.apiKey;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (FIREBASE_AVAILABLE) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app, firestoreDatabaseId);
    googleProvider = new GoogleAuthProvider();
  } catch (e) {
    console.warn('Firebase init failed — running in offline mode:', e);
  }
} else {
  console.warn('Firebase API key not set — running in offline mode. Auth & cloud save disabled.');
}

export { auth, db, googleProvider, FIREBASE_AVAILABLE };

export const loginWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase not configured — login unavailable.');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const logout = () => {
  if (!auth) return;
  return auth.signOut();
};
