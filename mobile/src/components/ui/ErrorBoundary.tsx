/**
 * ErrorBoundary — catches React render errors and shows a friendly
 * recovery screen instead of a white crash.
 *
 * Zoey looks concerned and offers a restart button. Never shows
 * stack traces or scary text to the child.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography, radius, MIN_TAP_TARGET } from "@/theme";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev — in production, send to Sentry/Crashlytics
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.zoey}>🥺</Text>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.body}>
            Zoey ran into a little problem.{"\n"}
            Let's try that again!
          </Text>

          <Pressable
            onPress={this.handleRestart}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>

          {__DEV__ && this.state.error && (
            <Text style={styles.devError}>{this.state.error.message}</Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  zoey: {
    fontSize: 80,
  },
  title: {
    ...typography.heading,
    color: colors.softBlack,
    textAlign: "center",
  },
  body: {
    ...typography.body,
    color: colors.charcoal,
    textAlign: "center",
    lineHeight: 30,
  },
  button: {
    backgroundColor: colors.sunflower,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    height: MIN_TAP_TARGET,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  buttonText: {
    ...typography.body,
    fontWeight: "800",
    color: colors.softBlack,
  },
  devError: {
    ...typography.caption,
    color: colors.midGray,
    textAlign: "center",
    marginTop: spacing.lg,
    fontSize: 11,
  },
});
