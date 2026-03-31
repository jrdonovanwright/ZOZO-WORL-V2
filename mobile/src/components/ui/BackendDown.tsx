/**
 * BackendDown — friendly screen shown when the API is unreachable.
 *
 * Never shows technical details. Zoey is "sleeping" and the child
 * can tap to retry. Auto-retries every 10 seconds in the background.
 */
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography, radius, MIN_TAP_TARGET } from "@/theme";

interface BackendDownProps {
  isChecking: boolean;
  onRetry: () => void;
}

export function BackendDown({ isChecking, onRetry }: BackendDownProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.zoey}>😴</Text>
      <Text style={styles.title}>Zoey is taking a nap</Text>
      <Text style={styles.body}>
        She'll be back in just a moment.{"\n"}
        Try again in a little bit!
      </Text>

      {isChecking ? (
        <ActivityIndicator size="large" color={colors.sunflower} style={styles.spinner} />
      ) : (
        <Pressable
          onPress={onRetry}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel="Try to connect again"
        >
          <Text style={styles.buttonText}>Wake Zoey Up</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
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
  spinner: {
    marginTop: spacing.md,
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
});
