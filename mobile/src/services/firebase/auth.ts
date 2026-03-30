/**
 * Firebase Auth operations + Axios token interceptor.
 *
 * initAuthInterceptor() must be called once inside a useEffect in the root
 * layout — not at module load time. This ensures Firebase is fully ready
 * before any auth calls are made.
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
import { getFirebaseAuth } from "./client";

// ---------------------------------------------------------------------------
// Interceptor — call once from root layout's useEffect, never at module level
// ---------------------------------------------------------------------------
export function initAuthInterceptor() {
  onIdTokenChanged(getFirebaseAuth(), async (user) => {
    if (user) {
      const token = await user.getIdToken();
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common["Authorization"];
    }
  });
}

// ---------------------------------------------------------------------------
// Auth operations
// ---------------------------------------------------------------------------

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(getFirebaseAuth(), email, password);

export const signUp = (email: string, password: string) =>
  createUserWithEmailAndPassword(getFirebaseAuth(), email, password);

export const signOut = () => firebaseSignOut(getFirebaseAuth());

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(getFirebaseAuth(), callback);

export const getIdToken = (): Promise<string> | null =>
  getFirebaseAuth().currentUser?.getIdToken() ?? null;
