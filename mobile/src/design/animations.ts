/**
 * Animation constants — duration tokens, spring configs, and easing presets.
 *
 * All animation configs defined here, never inline. Components reference
 * these by name so motion can be tuned globally.
 */
import { Easing, type WithSpringConfig, type WithTimingConfig } from "react-native-reanimated";

// ─── Duration Tokens ────────────────────────────────────────────────────────

export const duration = {
  instant: 100,
  fast: 200,
  normal: 350,
  slow: 600,
  cinematic: 1200,
} as const;

// ─── Easing Presets ─────────────────────────────────────────────────────────

export const easing = {
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  enter: Easing.bezier(0, 0, 0.2, 1),
  exit: Easing.bezier(0.4, 0, 1, 1),
  bounce: Easing.bezier(0.34, 1.56, 0.64, 1),
  gentle: Easing.inOut(Easing.ease),
  sine: Easing.inOut(Easing.sin),
  linear: Easing.linear,
} as const;

// ─── Timing Configs ─────────────────────────────────────────────────────────

export const timing = {
  /** Instant feedback (press states) */
  instant: { duration: duration.instant, easing: easing.standard } satisfies WithTimingConfig,
  /** Fast interactions (button presses, micro-feedback) */
  fast: { duration: duration.fast, easing: easing.standard } satisfies WithTimingConfig,
  /** Standard transitions (modals, cards) */
  normal: { duration: duration.normal, easing: easing.standard } satisfies WithTimingConfig,
  /** Deliberate motion (celebrations, reveals) */
  slow: { duration: duration.slow, easing: easing.gentle } satisfies WithTimingConfig,
  /** Cinematic sequences (celebration screen, story moments) */
  cinematic: { duration: duration.cinematic, easing: easing.gentle } satisfies WithTimingConfig,
  /** Fade in — for modals, overlays */
  fadeIn: { duration: duration.normal, easing: easing.enter } satisfies WithTimingConfig,
  /** Fade out */
  fadeOut: { duration: duration.fast, easing: easing.exit } satisfies WithTimingConfig,
} as const;

// ─── Spring Configs ─────────────────────────────────────────────────────────

export const spring = {
  /** Snappy — buttons, tap feedback */
  snappy: { damping: 15, stiffness: 300, mass: 0.8 } satisfies WithSpringConfig,
  /** Bouncy — celebrations, reveals */
  bouncy: { damping: 8, stiffness: 150, mass: 1 } satisfies WithSpringConfig,
  /** Gentle — modals, slide-ups */
  gentle: { damping: 20, stiffness: 120, mass: 1 } satisfies WithSpringConfig,
  /** Magnetic — drop zones, snap-to-place */
  magnetic: { damping: 12, stiffness: 200, mass: 0.6 } satisfies WithSpringConfig,
  /** Heavy — badge drops, large element reveals */
  heavy: { damping: 10, stiffness: 80, mass: 1.5 } satisfies WithSpringConfig,
  /** Rubber band — elastic return on incorrect drag */
  rubberBand: { damping: 6, stiffness: 120, mass: 1 } satisfies WithSpringConfig,
} as const;

// ─── Breathing / Idle Animations ────────────────────────────────────────────

export const idle = {
  /** Zoey's breathing cycle */
  breathingScale: { min: 1.0, max: 1.015, duration: 4000 },
  /** Zone card float */
  floatOffset: { min: -6, max: 6, duration: 2000 },
  /** Glow pulse */
  glowOpacity: { min: 0.3, max: 0.85, duration: 1800 },
  /** Particle drift */
  driftSpeed: { min: 0.5, max: 2.0 },
} as const;

// ─── Stagger Delays ────────────────────────────────────────────────────────

export const stagger = {
  /** Word-by-word text reveal */
  word: 80,
  /** List item cascade */
  listItem: 60,
  /** Grid cell cascade */
  gridCell: 40,
  /** Confetti burst waves */
  particleWave: 15,
} as const;
