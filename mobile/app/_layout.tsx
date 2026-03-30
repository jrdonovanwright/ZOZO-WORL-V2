import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { useAuthStore } from "@/store/authStore";
import { useChildStore } from "@/store/childStore";

// ⚠️  DEV ONLY — set to false to re-enable auth before shipping.
// When true, all Firebase auth imports are skipped entirely so no auth
// module-level code runs and the app goes straight to the child home screen.
const SKIP_AUTH_FOR_DEV = true;

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const { user, isLoading, setUser, setParent, setLoading, clear: clearAuth } = useAuthStore();
  const { children, setChildren, clear: clearChildren } = useChildStore();

  // -------------------------------------------------------------------------
  // Dev bypass — skip Firebase entirely, go straight to child home screen
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!SKIP_AUTH_FOR_DEV) return;
    SplashScreen.hideAsync();
    if (segments[0] !== "(child)") router.replace("/(child)/");
  }, [segments]);

  // -------------------------------------------------------------------------
  // Firebase auth listener — only runs when auth is enabled
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (SKIP_AUTH_FOR_DEV) return;

    // Dynamically import auth so none of its module-level code runs in dev bypass mode
    const { initAuthInterceptor, onAuthChange } =
      require("@/services/firebase/auth") as typeof import("@/services/firebase/auth");
    const { getMe } = require("@/services/api/auth") as typeof import("@/services/api/auth");
    const { getChildren } = require("@/services/api/children") as typeof import("@/services/api/children");

    initAuthInterceptor();

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const [parent, kids] = await Promise.all([getMe(), getChildren()]);
          setParent(parent);
          setChildren(kids);
        } catch (err) {
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
  // Routing guard — only runs when auth is enabled
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (SKIP_AUTH_FOR_DEV) return;
    if (isLoading) return;

    const group = segments[0] as string | undefined;

    if (!user) {
      if (group !== "(auth)") router.replace("/(auth)/sign-in");
    } else if (children.length === 0) {
      if (group !== "(onboarding)") router.replace("/(onboarding)/add-child");
    } else {
      if (group !== "(child)") router.replace("/(child)/");
    }
  }, [user, isLoading, children, segments]);

  return <Slot />;
}
