import { getApp, getApps, initializeApp } from "firebase/app";
import type { Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// auth is null until getFirebaseAuth() is first called.
// Nothing in this file calls getAuth at module level — that's what caused
// "Component auth has not been registered yet" on every earlier attempt.
let _auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    // require() defers firebase/auth loading until this function is called,
    // guaranteeing firebase/app is fully settled first.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAuth } = require("firebase/auth") as typeof import("firebase/auth");
    _auth = getAuth(app);
  }
  return _auth;
}

export default app;
