/**
 * Parent experience layout.
 *
 * Simple stack with a visible header and back button — parents are
 * comfortable with standard navigation chrome.
 */
import { Stack } from "expo-router";
import { colors, typography } from "@/theme";

export default function ParentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.softBlack,
        headerTitleStyle: { ...typography.heading, fontSize: 18 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.cream },
      }}
    />
  );
}
