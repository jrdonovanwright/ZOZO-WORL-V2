/**
 * useReduceMotion — respects the OS "Reduce Motion" accessibility setting.
 *
 * When enabled:
 *   - All animations use instant durations (no motion)
 *   - Particle systems are disabled
 *   - Parallax effects are disabled
 *   - Celebration confetti is replaced with a static badge reveal
 *
 * Every animated component must consume this hook and conditionally
 * use the reduced configs.
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { duration, timing, spring } from "@/design/animations";

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Initial check
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled ?? false);
    });

    // Live updates
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => setReduceMotion(enabled),
    );

    return () => sub.remove();
  }, []);

  return reduceMotion;
}

/**
 * Returns motion-safe animation configs — instant when reduce motion is on.
 *
 * Usage:
 *   const motion = useMotionSafe();
 *   value.value = withTiming(1, motion.timing.normal);
 */
export function useMotionSafe() {
  const reduced = useReduceMotion();

  if (reduced) {
    return {
      timing: {
        instant: { duration: 0 },
        fast: { duration: 0 },
        normal: { duration: 0 },
        slow: { duration: 0 },
        cinematic: { duration: 0 },
        fadeIn: { duration: 0 },
        fadeOut: { duration: 0 },
      },
      spring: {
        snappy: { damping: 100, stiffness: 1000 },
        bouncy: { damping: 100, stiffness: 1000 },
        gentle: { damping: 100, stiffness: 1000 },
        magnetic: { damping: 100, stiffness: 1000 },
        heavy: { damping: 100, stiffness: 1000 },
        rubberBand: { damping: 100, stiffness: 1000 },
      },
      particles: false,
      parallax: false,
      duration: {
        instant: 0,
        fast: 0,
        normal: 0,
        slow: 0,
        cinematic: 0,
      },
    } as const;
  }

  return {
    timing,
    spring,
    particles: true,
    parallax: true,
    duration,
  } as const;
}
