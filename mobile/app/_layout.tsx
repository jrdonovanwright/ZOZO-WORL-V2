/**
 * Root layout — auth gate.
 *
 * Responsibilities:
 *  1. Import firebase/auth.ts once to activate the Axios token interceptor.
 *  2. Subscribe to Firebase auth state changes.
 *  3. On sign-in: fetch parent profile + children from the backend.
 *  4. Route the user to the correct screen group based on auth + data state.
 *
 * Routing rules:
 *  • No user           → /(auth)/sign-in
 *  • User, no children → /(onboarding)/add-child
 *  • User, has children → /(child)/   (home)
 */
import "@/services/firebase/auth"; // activate Axios token interceptor

import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { onAuthChange } from "@/services/firebase/auth";
import { getMe } from "@/services/api/auth";
import { getChildren } from "@/services/api/children";
import { useAuthStore } from "@/store/authStore";
import { useChildStore } from "@/store/childStore";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const { user, isLoading, setUser, setParent, setLoading, clear: clearAuth } = useAuthStore();
  const { children, setChildren, clear: clearChildren } = useChildStore();

  // -------------------------------------------------------------------------
  // Firebase auth listener — runs once on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Fetch parent profile + children concurrently
          const [parent, kids] = await Promise.all([getMe(), getChildren()]);
          setParent(parent);
          setChildren(kids);
        } catch (err) {
          // Profile fetch failed — still authenticated, but treat as no children
          // so onboarding can complete and retry
          console.warn("Failed to load profile data:", err);
          setChildren([]);
        }
      } else {
        clearAuth();
        clearChildren();
      }

      setLoading(false);
      SplashScreen.hideAsync();
    });

    return unsubscribe;
  }, []);

  // -------------------------------------------------------------------------
  // Routing guard — runs whenever auth or children state changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isLoading) return;

    const group = segments[0] as string | undefined;
    const inAuth = group === "(auth)";
    const inOnboarding = group === "(onboarding)";
    const inChild = group === "(child)";

    if (!user) {
      if (!inAuth) router.replace("/(auth)/sign-in");
    } else if (children.length === 0) {
      if (!inOnboarding) router.replace("/(onboarding)/add-child");
    } else {
      if (!inChild) router.replace("/(child)/");
    }
  }, [user, isLoading, children, segments]);

  return <Slot />;
}
