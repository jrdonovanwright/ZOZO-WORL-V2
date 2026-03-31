/**
 * Game directory layout — passes through to the child stack.
 *
 * This file exists because Expo Router 6 requires a _layout.tsx in
 * directories containing dynamic routes ([subject].tsx) to resolve
 * navigation correctly.
 */
import { Slot } from "expo-router";

export default function GameLayout() {
  console.log("[GameLayout] Rendering");
  return <Slot />;
}
