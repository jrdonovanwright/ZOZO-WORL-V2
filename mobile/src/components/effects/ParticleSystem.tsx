/**
 * ParticleSystem — configurable particle effects powered by Reanimated.
 *
 * Each particle is a lightweight Animated.View with pre-computed ballistic
 * trajectories. All interpolation runs on the UI thread — zero JS bridge
 * calls during animation.
 *
 * Recommended max: 60 particles for Reanimated backend.
 * For 150+ particles (celebration confetti), use @shopify/react-native-skia
 * Canvas with a custom shader instead.
 *
 * Usage:
 *   <ParticleSystem
 *     count={30}
 *     shape="sparkle"
 *     colors={[palette.gold[400], palette.kente.red, palette.kente.green]}
 *     speed={{ min: 150, max: 400 }}
 *     size={{ min: 4, max: 12 }}
 *     lifetime={{ min: 800, max: 2000 }}
 *     emitFrom="point"
 *     origin={{ x: 180, y: 300 }}
 *     gravity={200}
 *   />
 */
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useReduceMotion } from "@/hooks/useReduceMotion";

// ─── Types ──────────────────────────────────────────────────────────────────

type ParticleShape = "circle" | "star" | "sparkle" | "petal" | "diamond";

interface Range {
  min: number;
  max: number;
}

interface ParticleConfig {
  /** Number of particles (max 60 recommended) */
  count: number;
  shape: ParticleShape;
  colors: string[];
  /** Pixels per second */
  speed: Range;
  /** Pixel diameter */
  size: Range;
  /** Milliseconds */
  lifetime: Range;
  /** Emission pattern */
  emitFrom: "point" | "edge" | "area";
  /** Emission origin (for "point") */
  origin?: { x: number; y: number };
  /** Container dimensions (for "edge" and "area") */
  area?: { width: number; height: number };
  /** Pixels per second squared downward */
  gravity?: number;
  /** Spread angle in degrees (360 = omnidirectional) */
  spread?: number;
  /** Stagger delay between particle spawns in ms */
  stagger?: number;
  /** Whether to loop continuously */
  loop?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Shape dimensions
const SHAPE_STYLES: Record<ParticleShape, (size: number, color: string) => object> = {
  circle: (s, c) => ({
    width: s,
    height: s,
    borderRadius: s / 2,
    backgroundColor: c,
  }),
  star: (s, c) => ({
    width: 0,
    height: 0,
    borderLeftWidth: s / 2,
    borderRightWidth: s / 2,
    borderBottomWidth: s,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: c,
  }),
  sparkle: (s, c) => ({
    width: s,
    height: s,
    borderRadius: s / 2,
    backgroundColor: c,
    // Sparkles are circles with a glow-like shadow
    shadowColor: c,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: s,
  }),
  petal: (s, c) => ({
    width: s * 0.6,
    height: s,
    borderRadius: s / 2,
    backgroundColor: c,
  }),
  diamond: (s, c) => ({
    width: s,
    height: s,
    backgroundColor: c,
    transform: [{ rotate: "45deg" }],
  }),
};

// ─── Single Particle ────────────────────────────────────────────────────────

interface ParticleProps {
  config: ParticleConfig;
  index: number;
}

function Particle({ config, index }: ParticleProps) {
  // Pre-compute random properties at mount
  const props = useMemo(() => {
    const size = rand(config.size.min, config.size.max);
    const color = randItem(config.colors);
    const speed = rand(config.speed.min, config.speed.max);
    const lifetime = rand(config.lifetime.min, config.lifetime.max);
    const spreadRad = ((config.spread ?? 360) * Math.PI) / 360;
    const angle = Math.random() * spreadRad * 2 - spreadRad;
    const vx = Math.sin(angle) * speed;
    const vy = -Math.cos(angle) * speed; // upward
    const gravity = config.gravity ?? 200;
    const staggerDelay = (config.stagger ?? 15) * index;

    // Compute ballistic endpoint at lifetime
    const t = lifetime / 1000;
    const endX = vx * t;
    const endY = vy * t + 0.5 * gravity * t * t;
    const endRotation = rand(-360, 360);

    // Starting position
    let startX = 0;
    let startY = 0;
    if (config.emitFrom === "point" && config.origin) {
      startX = config.origin.x;
      startY = config.origin.y;
    } else if (config.emitFrom === "edge" && config.area) {
      startX = rand(0, config.area.width);
      startY = -10;
    } else if (config.emitFrom === "area" && config.area) {
      startX = rand(0, config.area.width);
      startY = rand(0, config.area.height);
    }

    return { size, color, endX, endY, endRotation, lifetime, staggerDelay, startX, startY };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const { endX, endY, endRotation, lifetime, staggerDelay } = props;

    // Fade in quickly, hold, fade out
    opacity.value = withDelay(
      staggerDelay,
      withSequence(
        withTiming(1, { duration: lifetime * 0.1 }),
        withTiming(1, { duration: lifetime * 0.6 }),
        withTiming(0, { duration: lifetime * 0.3 }),
      ),
    );

    // Scale pop in then shrink
    scale.value = withDelay(
      staggerDelay,
      withSequence(
        withTiming(1.2, { duration: lifetime * 0.15, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: lifetime * 0.1 }),
        withTiming(0.3, { duration: lifetime * 0.75, easing: Easing.in(Easing.ease) }),
      ),
    );

    // Position — ballistic curve approximated by eased timing
    translateX.value = withDelay(
      staggerDelay,
      withTiming(endX, { duration: lifetime, easing: Easing.out(Easing.quad) }),
    );
    translateY.value = withDelay(
      staggerDelay,
      withTiming(endY, { duration: lifetime, easing: Easing.in(Easing.quad) }),
    );

    // Rotation
    rotate.value = withDelay(
      staggerDelay,
      withTiming(endRotation, { duration: lifetime, easing: Easing.linear }),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shapeStyle = useMemo(
    () => SHAPE_STYLES[config.shape](props.size, props.color),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: props.startX, top: props.startY },
        shapeStyle as any,
        animStyle,
      ]}
      pointerEvents="none"
    />
  );
}

// ─── Particle System Container ──────────────────────────────────────────────

export function ParticleSystem(config: ParticleConfig) {
  const reduceMotion = useReduceMotion();

  // Respect accessibility — no particles when reduce motion is on
  if (reduceMotion) return null;

  const count = Math.min(config.count, 60); // cap for performance

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <Particle key={i} config={config} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
  },
});
