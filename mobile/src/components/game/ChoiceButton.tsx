/**
 * ChoiceButton — a single tap target for multiple-choice answers.
 *
 * States:
 *   default  → tappable, sunflower background
 *   correct  → green, checkmark, slight scale-up bounce
 *   wrong    → red, X, slight shake
 *   disabled → greyed out (during speaking / loading states)
 */
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Pressable } from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

export type ChoiceState = "default" | "correct" | "wrong" | "disabled";

interface ChoiceButtonProps {
  id: string;
  text: string;
  emoji?: string;
  state: ChoiceState;
  onPress: (id: string) => void;
}

export function ChoiceButton({ id, text, emoji, state, onPress }: ChoiceButtonProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (state === "correct") {
      scale.value = withSequence(
        withSpring(1.08, { damping: 4 }),
        withSpring(1.0, { damping: 8 }),
      );
    } else if (state === "wrong") {
      translateX.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  const bg = {
    default: colors.sunflower,
    correct: colors.success,
    wrong: colors.error,
    disabled: colors.lightGray,
  }[state];

  const textColor = state === "disabled" ? colors.midGray : colors.softBlack;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => state === "default" && onPress(id)}
        disabled={state === "disabled"}
        accessibilityRole="button"
        accessibilityLabel={`${emoji ? emoji + " " : ""}${text}`}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: bg },
          pressed && state === "default" && styles.pressed,
        ]}
      >
        {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
        <Text style={[styles.text, { color: textColor }]}>{text}</Text>
        {state === "correct" && <Text style={styles.badge}>✓</Text>}
        {state === "wrong" && <Text style={styles.badge}>✗</Text>}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    minHeight: 72,
    shadowColor: colors.softBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  pressed: {
    opacity: 0.88,
  },
  emoji: {
    fontSize: 28,
  },
  text: {
    ...typography.heading,
    flexShrink: 1,
    textAlign: "center",
  },
  badge: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.white,
  },
});
