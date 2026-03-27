/**
 * Firebase Auth operations + Axios token interceptor.
 *
 * Importing this module registers the onIdTokenChanged listener that keeps
 * the Authorization header in sync with the current Firebase session.
 * Import it once at app startup (root _layout.tsx).
 */
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";

import { apiClient } from "@/services/api/client";
import { firebaseAuth } from "./client";

// ---------------------------------------------------------------------------
// Axios token interceptor
//
// Fires whenever the ID token is issued, refreshed, or revoked. Keeps every
// outbound API request authenticated without any per-call token fetching.
// ---------------------------------------------------------------------------
onIdTokenChanged(firebaseAuth, async (user) => {
  if (user) {
    const token = await user.getIdToken();
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
});

// ---------------------------------------------------------------------------
// Auth operations
// ---------------------------------------------------------------------------

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(firebaseAuth, email, password);

export const signUp = (email: string, password: string) =>
  createUserWithEmailAndPassword(firebaseAuth, email, password);

export const signOut = () => firebaseSignOut(firebaseAuth);

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(firebaseAuth, callback);

export const getIdToken = (): Promise<string> | null =>
  firebaseAuth.currentUser?.getIdToken() ?? null;
