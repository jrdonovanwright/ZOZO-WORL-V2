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

function SessionTrackerMount() {
  useSessionTracker();
  useSessionHeartbeat();
  return null;
}

export default function ChildLayout() {
  return (
    <>
      <SessionTrackerMount />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.cream },
          animation: "fade",
          gestureEnabled: false, // children shouldn't be able to swipe back
        }}
      />
    </>
  );
}
