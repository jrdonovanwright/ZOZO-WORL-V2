/**
 * Sign-in / Sign-up screen — parent-facing.
 *
 * One screen handles both modes. Toggling between them swaps the Firebase
 * call (signInWithEmailAndPassword vs createUserWithEmailAndPassword).
 * After a successful auth event the root layout's onAuthStateChanged fires
 * and handles routing automatically.
 */
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { signIn, signUp } from "@/services/firebase/auth";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { colors, spacing, typography } from "@/theme";

type Mode = "signin" | "signup";

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Incorrect password. Try again.",
  "auth/email-already-in-use": "An account with that email already exists. Try signing in.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your connection.",
};

function friendlyError(code: string): string {
  return FIREBASE_ERRORS[code] ?? "Something went wrong. Please try again.";
}

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "signup";

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      // Root layout's onAuthStateChanged takes over from here — no explicit navigate needed.
    } catch (err: any) {
      setError(friendlyError(err.code ?? ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🌟</Text>
            <Text style={styles.title}>Zoey's World</Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? "Create your family's account"
                : "Welcome back!"}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
              returnKeyType="next"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder={isSignUp ? "Choose a password" : "Your password"}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label={isSignUp ? "Create Account" : "Sign In"}
              onPress={handleSubmit}
              loading={loading}
              size="medium"
            />
          </View>

          {/* Mode toggle */}
          <Pressable
            onPress={() => {
              setMode(isSignUp ? "signin" : "signup");
              setError(null);
            }}
            style={styles.toggle}
            accessibilityRole="button"
          >
            <Text style={styles.toggleText}>
              {isSignUp
                ? "Already have an account? "
                : "New here? "}
              <Text style={styles.toggleLink}>
                {isSignUp ? "Sign in" : "Create account"}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    fontSize: 64,
  },
  title: {
    ...typography.displayMedium,
    color: colors.softBlack,
  },
  subtitle: {
    ...typography.parentBody,
    color: colors.charcoal,
    textAlign: "center",
  },
  form: {
    gap: spacing.md,
  },
  error: {
    ...typography.parentCaption,
    color: colors.error,
    textAlign: "center",
  },
  toggle: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  toggleText: {
    ...typography.parentBody,
    color: colors.charcoal,
  },
  toggleLink: {
    color: colors.softBlack,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
