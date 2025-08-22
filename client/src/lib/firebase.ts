import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDR5V0npjgER23v711L52cYclOKbaA80v4",
  authDomain: "keys1000-4ce89.firebaseapp.com",
  projectId: "keys1000-4ce89",
  storageBucket: "keys1000-4ce89.firebasestorage.app",
  messagingSenderId: "493432398338",
  appId: "1:493432398338:web:7116f62b36a7ee8d967d1b",
  measurementId: "G-JGS5HGL2KQ"
};

// Initialize Firebase (prevent duplicate app error during hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;
