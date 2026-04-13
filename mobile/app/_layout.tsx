import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAuthStore } from "@/store/authStore";
import { useChildStore } from "@/store/childStore";
import { buildFontAssets } from "@/design/tokens";

// ⚠️  DEV ONLY — set to false to re-enable auth before shipping.
// When true, all Firebase auth imports are skipped entirely so no auth
// module-level code runs and the app goes straight to the child home screen.
const SKIP_AUTH_FOR_DEV = true;

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const { user, isLoading, setUser, setParent, setLoading, clear: clearAuth } = useAuthStore();
  const { children, setChildren, clear: clearChildren } = useChildStore();

  // -------------------------------------------------------------------------
  // Load fonts before anything renders
  // -------------------------------------------------------------------------
  useEffect(() => {
    const loadFonts = async () => {
      try {
        const assets = buildFontAssets();
        if (Object.keys(assets).length > 0) {
          await Font.loadAsync(assets);
        }
      } catch (err) {
        console.warn("Font loading failed, using system fonts:", err);
      }
      setFontsLoaded(true);
    };
    loadFonts();
  }, []);

  // -------------------------------------------------------------------------
  // Dev bypass — skip Firebase entirely, go straight to child home screen
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!SKIP_AUTH_FOR_DEV) return;
    if (!fontsLoaded) return; // wait for fonts
    SplashScreen.hideAsync();
    if (segments[0] !== "(child)") router.replace("/(child)/");
  }, [segments, fontsLoaded]);

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
      if (fontsLoaded) SplashScreen.hideAsync();
    });

    return unsubscribe;
  }, [fontsLoaded]);

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

  // Always render Slot — Expo Router requires the navigation container to be mounted.
  // Splash screen stays visible until fontsLoaded flips to true above.
  // ErrorBoundary catches any render error in the entire app tree.
  return (
    <ErrorBoundary>
      <Slot />
    </ErrorBoundary>
  );
}
