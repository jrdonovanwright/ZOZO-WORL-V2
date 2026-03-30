/**
 * ZoneCard — an animated "island" tile on the world map.
 *
 * Behaviors:
 *  - Floats gently up/down (staggered per zone)
 *  - Pulsing gold ring when isRecommended (Zoey picked this zone)
 *  - Dimmed overlay + lock icon when isLocked
 *  - Bounce-press feedback on tap
 */
import { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors, radius, spacing, typography } from "@/theme";
import type { ZoneState } from "@/hooks/useWorldMap";

export interface ZoneMeta {
  subjectId: string;
  name: string;
  emoji: string;
  colorKey: keyof typeof colors;
  tagline: string;
  /** Scattered decorative emoji shown on the card */
  decor: [string, string];
}

interface ZoneCardProps {
  zone: ZoneMeta;
  state: ZoneState;
  floatDelay?: number;  // ms — stagger float animation start
  onPress: () => void;
  /** Render a wider card (used for the center Science Lab zone) */
  wide?: boolean;
}

const FLOAT_AMPLITUDE = 6;   // px
const FLOAT_DURATION  = 2000; // ms per half-cycle

export function ZoneCard({ zone, state, floatDelay = 0, onPress, wide = false }: ZoneCardProps) {
  const bg = (colors[zone.colorKey] as string) ?? colors.lavender;

  // Float animation
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withDelay(
      floatDelay,
      withRepeat(
        withSequence(
          withTiming(-FLOAT_AMPLITUDE, {
            duration: FLOAT_DURATION,
            easing: Easing.inOut(Easing.sine),
          }),
          withTiming(0, {
            duration: FLOAT_DURATION,
            easing: Easing.inOut(Easing.sine),
          }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  // Recommended glow ring
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  useEffect(() => {
    if (state.isRecommended) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 800 }),
          withTiming(0.3, { duration: 800 }),
        ),
        -1,
        false,
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 800, easing: Easing.inOut(Easing.sine) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.sine) }),
        ),
        -1,
        false,
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
      glowScale.value = withTiming(1, { duration: 300 });
    }
  }, [state.isRecommended]);

  // Press scale
  const pressScale = useSharedValue(1);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    if (!state.isLocked) {
      pressScale.value = withSpring(0.93, { damping: 10 });
    }
  };
  const handlePressOut = () => {
    pressScale.value = withSpring(1.0, { damping: 8 });
  };

  // Level dots — show up to 5
  const maxDots = 5;
  const filledDots = Math.min(state.level, maxDots);

  return (
    <Animated.View style={floatStyle}>
      {/* Glow ring behind the card */}
      {state.isRecommended && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.glowRing,
            { borderColor: colors.sunflower },
            glowStyle,
          ]}
          pointerEvents="none"
        />
      )}

      <Animated.View style={pressStyle}>
        <Pressable
          onPress={state.isLocked ? undefined : onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={
            state.isLocked
              ? `${zone.name} — locked`
              : `${zone.name}${state.isRecommended ? ", recommended by Zoey" : ""}`
          }
          style={[styles.card, { backgroundColor: bg }, wide && styles.cardWide]}
        >
          {/* Decorative corner emoji */}
          <Text style={styles.decorTL}>{zone.decor[0]}</Text>
          <Text style={styles.decorBR}>{zone.decor[1]}</Text>

          {/* Zone emoji */}
          <Text style={styles.zoneEmoji}>{zone.emoji}</Text>

          {/* Zone name */}
          <Text style={styles.zoneName}>{zone.name}</Text>

          {/* Tagline */}
          <Text style={styles.tagline}>{zone.tagline}</Text>

          {/* Level dots */}
          {state.questionsAnswered > 0 && (
            <View style={styles.dots}>
              {Array.from({ length: maxDots }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < filledDots ? styles.dotFilled : styles.dotEmpty,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Recommended badge */}
          {state.isRecommended && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>⭐ Zoey picks!</Text>
            </View>
          )}

          {/* Lock overlay */}
          {state.isLocked && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockEmoji}>🔒</Text>
              <Text style={styles.lockText}>Coming soon!</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 158,
    minHeight: 175,
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    overflow: "hidden",
  },
  glowRing: {
    borderRadius: radius.xl + 6,
    borderWidth: 3,
    margin: -6,
    zIndex: -1,
  },
  decorTL: {
    position: "absolute",
    top: 8,
    left: 10,
    fontSize: 18,
    opacity: 0.5,
  },
  decorBR: {
    position: "absolute",
    bottom: 8,
    right: 10,
    fontSize: 18,
    opacity: 0.5,
  },
  zoneEmoji: {
    fontSize: 52,
  },
  zoneName: {
    ...typography.caption,
    fontWeight: "800",
    color: colors.softBlack,
    textAlign: "center",
  },
  tagline: {
    ...typography.caption,
    fontSize: 13,
    color: colors.charcoal,
    textAlign: "center",
    opacity: 0.8,
  },
  dots: {
    flexDirection: "row",
    gap: 4,
    marginTop: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: colors.softBlack,
    opacity: 0.6,
  },
  dotEmpty: {
    backgroundColor: colors.softBlack,
    opacity: 0.15,
  },
  recommendedBadge: {
    position: "absolute",
    top: -1,
    right: -1,
    backgroundColor: colors.sunflower,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderTopRightRadius: radius.xl,
    borderBottomLeftRadius: radius.lg,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.softBlack,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  lockEmoji: {
    fontSize: 32,
  },
  lockText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.charcoal,
  },
  cardWide: {
    width: 200,
    minHeight: 165,
  },
});
