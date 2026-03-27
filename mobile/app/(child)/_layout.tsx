/**
 * Child experience layout.
 *
 * No navigation chrome visible to the child — no header, no tab bar, no back
 * button. The full screen belongs to Zoey. Parent access is through a small
 * icon tucked into the home screen corner.
 */
import { Stack } from "expo-router";
import { colors } from "@/theme";

export default function ChildLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.cream },
        animation: "fade",
        gestureEnabled: false, // children shouldn't be able to swipe back
      }}
    />
  );
}
