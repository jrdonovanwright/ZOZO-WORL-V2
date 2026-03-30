/**
 * StreakPlant — animated growing garden that visualizes the child's streak.
 *
 * 7 visual stages (one per consecutive day):
 *   0 → empty pot (no streak / just started)
 *   1 → tiny seedling
 *   2 → small sprout with two leaves
 *   3 → taller plant, two leaf pairs
 *   4 → tall plant, three leaf pairs
 *   5 → plant with bud
 *   6 → flower opening
 *   7 → full bloom with sparkles
 *
 * "At-risk" state: plant tilts/droops slightly and leaves dull.
 * Built entirely with RN Views + Reanimated — no react-native-svg dependency.
 */
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors, radius, spacing } from "@/theme";

interface StreakPlantProps {
  plantStage: number;         // 0–7
  isAtRisk: boolean;
  streakCount: number;
}

// ── Leaf component ──────────────────────────────────────────────────────────

function Leaf({
  side,
  y,
  size,
  hue,
}: {
  side: "left" | "right";
  y: number;
  size: number;
  hue: string;
}) {
  const rotation = side === "left" ? "-35deg" : "35deg";
  const offsetX = side === "left" ? -(size * 0.7) : size * 0.7;

  return (
    <View
      style={[
        styles.leaf,
        {
          width: size,
          height: size * 0.6,
          borderRadius: size * 0.3,
          backgroundColor: hue,
          bottom: y,
          left: "50%",
          marginLeft: offsetX - size / 2,
          transform: [{ rotate: rotation }],
        },
      ]}
    />
  );
}

// ── Petal component ─────────────────────────────────────────────────────────

function Petal({ angle, size, color }: { angle: number; size: number; color: string }) {
  return (
    <View
      style={[
        styles.petal,
        {
          width: size,
          height: size * 1.5,
          borderRadius: size * 0.75,
          backgroundColor: color,
          transform: [
            { rotate: `${angle}deg` },
            { translateY: -size },
          ],
        },
      ]}
    />
  );
}

// ── Sparkle ─────────────────────────────────────────────────────────────────

function Sparkle({ delay }: { delay: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0, { duration: 600 }),
        ),
        -1,
      );
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.Text style={[styles.sparkle, style]}>✨</Animated.Text>;
}

// ── Main component ──────────────────────────────────────────────────────────

export function StreakPlant({ plantStage, isAtRisk, streakCount }: StreakPlantProps) {
  const stage = Math.min(Math.max(0, plantStage), 7);

  // Tilt when at-risk (wilting)
  const tilt = useSharedValue(0);
  useEffect(() => {
    tilt.value = withTiming(isAtRisk ? -10 : 0, {
      duration: 800,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isAtRisk]);

  // Gentle sway animation for healthy plants
  const sway = useSharedValue(0);
  useEffect(() => {
    if (stage >= 2 && !isAtRisk) {
      sway.value = withRepeat(
        withSequence(
          withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.sine) }),
          withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.sine) }),
        ),
        -1,
      );
    } else {
      sway.value = withTiming(0, { duration: 400 });
    }
  }, [stage, isAtRisk]);

  // Growth pop when stage changes
  const growScale = useSharedValue(1);
  useEffect(() => {
    growScale.value = withSequence(
      withTiming(0.85, { duration: 100 }),
      withSpring(1, { damping: 6, stiffness: 120 }),
    );
  }, [stage]);

  const plantStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${tilt.value + sway.value}deg` },
      { scale: growScale.value },
    ],
  }));

  const leafGreen = isAtRisk ? "#9CB89C" : "#4CAF50";
  const leafDark = isAtRisk ? "#7A9A7A" : "#388E3C";

  // Stem height grows with stage
  const stemHeight = Math.max(stage * 14, 8);

  return (
    <View style={styles.container}>
      {/* Streak counter label */}
      <Text style={styles.streakLabel}>
        {streakCount > 0 ? `${streakCount} day${streakCount !== 1 ? "s" : ""}` : "New seed!"}
      </Text>

      <Animated.View style={[styles.plantArea, plantStyle]}>
        {/* Sparkles for full bloom */}
        {stage === 7 && (
          <View style={styles.sparkleContainer}>
            <Sparkle delay={0} />
            <Sparkle delay={400} />
            <Sparkle delay={800} />
          </View>
        )}

        {/* Flower (stages 5–7) */}
        {stage >= 5 && (
          <View style={[styles.flowerCenter, { bottom: stemHeight + 24 }]}>
            {/* Petals */}
            {stage >= 6 && (
              <>
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <Petal
                    key={angle}
                    angle={angle}
                    size={stage === 7 ? 12 : 8}
                    color={stage === 7 ? "#FFD93D" : "#FFE082"}
                  />
                ))}
              </>
            )}
            {/* Bud / center */}
            <View
              style={[
                styles.bud,
                {
                  width: stage >= 6 ? 14 : 10,
                  height: stage >= 6 ? 14 : 10,
                  backgroundColor: stage >= 6 ? "#FF6B6B" : "#81C784",
                  borderRadius: 7,
                },
              ]}
            />
          </View>
        )}

        {/* Leaves */}
        {stage >= 2 && (
          <>
            <Leaf side="left" y={28} size={stage >= 4 ? 20 : 16} hue={leafGreen} />
            <Leaf side="right" y={28} size={stage >= 4 ? 20 : 16} hue={leafDark} />
          </>
        )}
        {stage >= 3 && (
          <>
            <Leaf side="left" y={50} size={stage >= 5 ? 18 : 14} hue={leafDark} />
            <Leaf side="right" y={50} size={stage >= 5 ? 18 : 14} hue={leafGreen} />
          </>
        )}
        {stage >= 4 && (
          <>
            <Leaf side="left" y={70} size={16} hue={leafGreen} />
            <Leaf side="right" y={70} size={16} hue={leafDark} />
          </>
        )}

        {/* Stem */}
        {stage >= 1 && (
          <View
            style={[
              styles.stem,
              {
                height: stemHeight,
                backgroundColor: isAtRisk ? "#9CB89C" : "#66BB6A",
              },
            ]}
          />
        )}

        {/* Seedling tip (stage 1 only) */}
        {stage === 1 && (
          <View style={[styles.seedlingTip, { backgroundColor: leafGreen }]} />
        )}
      </Animated.View>

      {/* Pot */}
      <View style={styles.pot}>
        <View style={styles.potRim} />
        <View style={styles.potBody} />
        <View style={styles.soil} />
      </View>

      {/* Tend your garden message for at-risk */}
      {isAtRisk && (
        <Text style={styles.atRiskLabel}>Water me! 💧</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: 120,
    height: 180,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.charcoal,
    marginBottom: 2,
  },
  plantArea: {
    width: 100,
    height: 120,
    alignItems: "center",
    justifyContent: "flex-end",
    // transformOrigin is at center-bottom (pot connection)
  },

  // Stem
  stem: {
    width: 5,
    borderRadius: 3,
  },

  // Seedling tip
  seedlingTip: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: -2,
  },

  // Leaves
  leaf: {
    position: "absolute",
  },

  // Flower
  flowerCenter: {
    position: "absolute",
    left: "50%",
    marginLeft: -7,
    alignItems: "center",
    justifyContent: "center",
  },
  bud: {},
  petal: {
    position: "absolute",
  },

  // Sparkles
  sparkleContainer: {
    position: "absolute",
    top: -5,
    flexDirection: "row",
    gap: 8,
  },
  sparkle: {
    fontSize: 14,
  },

  // Pot
  pot: {
    alignItems: "center",
    marginTop: -2,
  },
  potRim: {
    width: 56,
    height: 8,
    backgroundColor: "#E07B3C",
    borderRadius: 4,
  },
  potBody: {
    width: 48,
    height: 20,
    backgroundColor: "#C45C1A",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  soil: {
    position: "absolute",
    top: 4,
    width: 44,
    height: 8,
    backgroundColor: "#8B6513",
    borderRadius: 4,
  },

  // At-risk
  atRiskLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.sky,
    marginTop: 4,
  },
});
