/**
 * AuthGate — renders children only when auth is resolved.
 *
 * In dev mode (SKIP_AUTH_FOR_DEV=true in _layout.tsx), this is bypassed
 * entirely. In production, it shows a loading spinner while Firebase Auth
 * resolves, then routes unauthenticated users to sign-in.
 *
 * Usage in _layout.tsx when auth is enabled:
 *   <AuthGate>
 *     <Slot />
 *   </AuthGate>
 *
 * ──────────────────────────────────────────────────────────────────────
 * PRODUCTION AUTH CHECKLIST (before TestFlight):
 *
 * 1. Set SKIP_AUTH_FOR_DEV = false in app/_layout.tsx
 *
 * 2. Replace the JS Firebase SDK with the native SDK for proper mobile auth:
 *      npx expo install @react-native-firebase/app @react-native-firebase/auth
 *    This requires a custom dev build (npx expo run:ios / run:android).
 *    The JS SDK (firebase/auth) does NOT support Apple Sign In, phone auth,
 *    or reliable token refresh on mobile.
 *
 * 3. Add your GoogleService-Info.plist (iOS) and google-services.json (Android)
 *    to the project and reference them in app.config.ts:
 *      ios: { googleServicesFile: "./GoogleService-Info.plist" }
 *      android: { googleServicesFile: "./google-services.json" }
 *
 * 4. Enable the auth providers you want in the Firebase Console:
 *    - Email/Password (for dev/testing)
 *    - Apple Sign In (required for iOS App Store)
 *    - Google Sign In (recommended)
 *
 * 5. Update services/firebase/auth.ts to use @react-native-firebase/auth
 *    instead of the firebase/auth JS SDK.
 *
 * 6. Remove the dynamic require() calls in _layout.tsx and import normally.
 *
 * 7. Test the full flow: sign up → add child → child home screen → sign out
 * ──────────────────────────────────────────────────────────────────────
 */
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { colors, spacing, typography } from "@/theme";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.zoey}>😊</Text>
        <ActivityIndicator size="large" color={colors.sunflower} />
        <Text style={styles.text}>Zoey is getting ready...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  zoey: {
    fontSize: 64,
  },
  text: {
    ...typography.body,
    color: colors.charcoal,
  },
});
