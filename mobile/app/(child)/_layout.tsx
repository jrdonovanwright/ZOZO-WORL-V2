/**
 * Child experience layout — minimal stable version.
 *
 * Session tracking hooks removed temporarily to isolate navigation crash.
 * They will be added back once zone navigation is confirmed working.
 */
import { Stack } from "expo-router";

export default function ChildLayout() {
  console.log("[ChildLayout] Rendering");
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFF8E7" },
        animation: "fade",
        gestureEnabled: false,
      }}
    />
  );
}
