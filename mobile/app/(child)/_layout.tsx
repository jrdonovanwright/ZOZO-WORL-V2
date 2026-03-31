/**
 * Child experience layout.
 *
 * No navigation chrome visible to the child — no header, no tab bar, no back
 * button. The full screen belongs to Zoey. Parent access is through a small
 * icon tucked into the home screen corner.
 *
 * useSessionTracker is mounted here so it spans the full child session —
 * tracking zones visited, answers, and firing the parent report when the
 * app goes to background or after 20 minutes.
 */
import { Stack } from "expo-router";
import { colors } from "@/theme";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { useSessionHeartbeat } from "@/hooks/useSessionHeartbeat";

// Hooks mounted via the layout component itself — no wrapper needed.
// This avoids Fragment/navigator nesting issues in Expo Router.

export default function ChildLayout() {
  // These hooks are safe to call here — they only set up intervals and listeners,
  // they don't render anything or affect the navigator.
  useSessionTracker();
  useSessionHeartbeat();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.cream },
        animation: "fade",
        gestureEnabled: false,
      }}
    />
  );
}
