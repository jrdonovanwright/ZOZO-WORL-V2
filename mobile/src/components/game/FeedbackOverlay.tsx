/**
 * FeedbackOverlay — appears over the game screen after an answer is tapped.
 *
 * Slides up from bottom, shows Zoey's reaction text, fades out automatically.
 * Correct: green, celebration. Wrong: soft, encouraging.
 */
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors, radius, spacing, typography } from "@/theme";

interface FeedbackOverlayProps {
  visible: boolean;
  isCorrect: boolean;
  message: string;
}

export function FeedbackOverlay({ visible, isCorrect, message }: FeedbackOverlayProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
      translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(24, { duration: 200 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const bg = isCorrect ? colors.success : colors.lavender;

  return (
    <Animated.View style={[styles.container, { backgroundColor: bg }, animStyle]}>
      <Text style={styles.icon}>{isCorrect ? "🎉" : "💛"}</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 140,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    shadowColor: colors.softBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: 32,
  },
  message: {
    ...typography.body,
    color: colors.softBlack,
    flex: 1,
    flexWrap: "wrap",
  },
});
