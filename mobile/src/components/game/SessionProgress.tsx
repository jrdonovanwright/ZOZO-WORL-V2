/**
 * SessionProgress — a row of dots showing how far through the session we are.
 * Filled dots = answered, current dot = pulsing, empty = upcoming.
 */
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

import { colors, spacing } from "@/theme";
import { SESSION_LENGTH } from "@/hooks/useGameSession";

interface SessionProgressProps {
  current: number; // 0-based index of current question
}

export function SessionProgress({ current }: SessionProgressProps) {
  return (
    <View style={styles.row} accessibilityLabel={`Question ${current + 1} of ${SESSION_LENGTH}`}>
      {Array.from({ length: SESSION_LENGTH }).map((_, i) => (
        <Dot key={i} state={i < current ? "done" : i === current ? "active" : "upcoming"} />
      ))}
    </View>
  );
}

function Dot({ state }: { state: "done" | "active" | "upcoming" }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (state === "active") {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg =
    state === "done" ? colors.mint :
    state === "active" ? colors.sunflower :
    colors.lightGray;

  return (
    <Animated.View style={[styles.dot, { backgroundColor: bg }, animStyle]} />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
