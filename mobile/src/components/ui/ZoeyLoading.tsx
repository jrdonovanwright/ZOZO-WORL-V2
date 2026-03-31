/**
 * ZoeyLoading — friendly loading state shown while API calls resolve.
 *
 * Zoey is "thinking" with a pulsing animation. Optional message
 * tells the child what's happening ("Zoey is thinking of a question...").
 *
 * Use this instead of a plain ActivityIndicator on any child-facing screen.
 */
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { colors, spacing, typography } from "@/theme";

interface ZoeyLoadingProps {
  message?: string;
  size?: "small" | "large";
}

export function ZoeyLoading({
  message = "Zoey is getting ready...",
  size = "large",
}: ZoeyLoadingProps) {
  const scale = useSharedValue(1);
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    // Zoey breathing
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );

    // Staggered thinking dots
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 }),
      ),
      -1,
    );
    setTimeout(() => {
      dot2.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
      );
    }, 150);
    setTimeout(() => {
      dot3.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
      );
    }, 300);
  }, []);

  const zoeyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  const isSmall = size === "small";
  const emojiSize = isSmall ? 48 : 80;

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <Animated.Text style={[{ fontSize: emojiSize }, zoeyStyle]}>
        🤔
      </Animated.Text>

      <View style={styles.dots}>
        <Animated.Text style={[styles.dot, s1]}>●</Animated.Text>
        <Animated.Text style={[styles.dot, s2]}>●</Animated.Text>
        <Animated.Text style={[styles.dot, s3]}>●</Animated.Text>
      </View>

      <Text style={[styles.message, isSmall && styles.messageSmall]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  containerSmall: {
    flex: 0,
    padding: spacing.lg,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    fontSize: 16,
    color: colors.sunflower,
  },
  message: {
    ...typography.body,
    color: colors.charcoal,
    textAlign: "center",
  },
  messageSmall: {
    fontSize: 16,
  },
});
