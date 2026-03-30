/**
 * ZoeyCharacter — full state machine character controller.
 *
 * Manages Zoey's visual state across 9 emotional/behavioral states.
 * Each state drives: animation timing, expression, body language, and
 * interaction hints. When Lottie assets are added, each state maps to
 * a Lottie animation file; until then, expressive emoji + Reanimated
 * body animations serve as the rendering layer.
 *
 * State machine transitions are immediate — no queuing. The most recent
 * setState call wins. Components control Zoey's state; she doesn't
 * decide her own mood.
 *
 * Lip sync: when in "talking" state and audioPlaying is true, the mouth
 * animation pulses at a rate driven by an external amplitude value
 * (0-1 shared value) that the caller can drive from audio analysis.
 *
 * Eye tracking: on the world map, pass `lookAt` to make Zoey's eyes
 * subtly follow a point (constrained to ±4px offset).
 */
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { palette, colors } from "@/design/tokens";
import { shadows } from "@/design/shadows";
import { spring as springConfigs, idle, duration } from "@/design/animations";
import { useReduceMotion } from "@/hooks/useReduceMotion";

// ─── State types ────────────────────────────────────────────────────────────

export type ZoeyState =
  | "idle"          // gentle breathing loop
  | "talking"       // mouth animation (synced to audio if amplitude provided)
  | "listening"     // leaning forward, ear tilt
  | "thinking"      // finger to chin, eyes up
  | "celebrating"   // full body bounce
  | "encouraging"   // thumbs up, warm smile
  | "concerned"     // soft worried expression
  | "excited"       // bouncing, wide eyes
  | "walking";      // path walk cycle

interface ZoeyCharacterProps {
  /** Current state — drives all animations */
  state?: ZoeyState;
  /** Size in pixels (diameter) */
  size?: number;
  /** Audio amplitude 0-1 for lip sync (only used in "talking" state) */
  amplitude?: Animated.SharedValue<number>;
  /** Point for eye tracking (world map) — Zoey looks toward this coordinate */
  lookAt?: { x: number; y: number } | null;
  /** Zoey's center position (for computing eye offset from lookAt) */
  position?: { x: number; y: number };
}

// ─── State config ───────────────────────────────────────────────────────────

interface StateConfig {
  emoji: string;
  bgColor: string;
  ringColor: string;
  breatheIntensity: number;  // 0 = none, 1 = normal
  bounce: boolean;
  tilt: number;              // degrees
  ringPulse: boolean;
}

const STATE_CONFIGS: Record<ZoeyState, StateConfig> = {
  idle:         { emoji: "😊", bgColor: palette.lavender[300], ringColor: palette.gold[400],  breatheIntensity: 1.0, bounce: false, tilt: 0,   ringPulse: false },
  talking:      { emoji: "😄", bgColor: palette.lavender[300], ringColor: palette.gold[400],  breatheIntensity: 0.3, bounce: false, tilt: 0,   ringPulse: true  },
  listening:    { emoji: "👂", bgColor: palette.sky[200],      ringColor: palette.sky[400],   breatheIntensity: 0.5, bounce: false, tilt: 5,   ringPulse: false },
  thinking:     { emoji: "🤔", bgColor: palette.royal[200],    ringColor: palette.royal[400], breatheIntensity: 0.5, bounce: false, tilt: -3,  ringPulse: false },
  celebrating:  { emoji: "🎉", bgColor: palette.gold[200],     ringColor: palette.gold[500],  breatheIntensity: 0.2, bounce: true,  tilt: 0,   ringPulse: true  },
  encouraging:  { emoji: "👍", bgColor: palette.mint[200],      ringColor: palette.mint[400],  breatheIntensity: 0.8, bounce: false, tilt: 3,   ringPulse: false },
  concerned:    { emoji: "🥺", bgColor: palette.peach[200],     ringColor: palette.peach[400], breatheIntensity: 0.6, bounce: false, tilt: -5,  ringPulse: false },
  excited:      { emoji: "🤩", bgColor: palette.gold[200],     ringColor: palette.gold[400],  breatheIntensity: 0.3, bounce: true,  tilt: 0,   ringPulse: true  },
  walking:      { emoji: "🚶", bgColor: palette.lavender[300], ringColor: palette.gold[400],  breatheIntensity: 0.4, bounce: false, tilt: 0,   ringPulse: false },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function ZoeyCharacter({
  state = "idle",
  size = 140,
  amplitude,
  lookAt,
  position,
}: ZoeyCharacterProps) {
  const reduceMotion = useReduceMotion();
  const config = STATE_CONFIGS[state];

  // ── Breathing ───────────────────────────────────────────────────────────
  const breathe = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion || config.breatheIntensity === 0) {
      breathe.value = 1;
      return;
    }
    const mag = idle.breathingScale.max * config.breatheIntensity;
    breathe.value = withRepeat(
      withSequence(
        withTiming(1 + (mag - 1), { duration: idle.breathingScale.duration / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: idle.breathingScale.duration / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [state, reduceMotion]);

  // ── Bounce (celebrating, excited) ───────────────────────────────────────
  const bounceY = useSharedValue(0);
  useEffect(() => {
    if (config.bounce && !reduceMotion) {
      bounceY.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
        ),
        -1,
      );
    } else {
      bounceY.value = withTiming(0, { duration: duration.fast });
    }
  }, [state, reduceMotion]);

  // ── Tilt ────────────────────────────────────────────────────────────────
  const tiltDeg = useSharedValue(0);
  useEffect(() => {
    tiltDeg.value = withTiming(config.tilt, { duration: duration.normal });
  }, [state]);

  // ── Ring pulse (talking, celebrating, excited) ──────────────────────────
  const ringOpacity = useSharedValue(0);
  const ringScale = useSharedValue(1);
  useEffect(() => {
    if (config.ringPulse && !reduceMotion) {
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 400 }),
          withTiming(0.15, { duration: 400 }),
        ),
        -1,
      );
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 400 }),
          withTiming(1.0, { duration: 400 }),
        ),
        -1,
      );
    } else {
      ringOpacity.value = withTiming(0, { duration: duration.fast });
      ringScale.value = withTiming(1, { duration: duration.fast });
    }
  }, [state, reduceMotion]);

  // ── Lip sync (talking + amplitude) ─────────────────────────────────────
  const mouthScale = useDerivedValue(() => {
    if (state !== "talking" || !amplitude) return 1;
    // Map amplitude 0-1 to mouth scale 1.0-1.3
    return interpolate(amplitude.value, [0, 1], [1.0, 1.3]);
  });

  // ── Eye tracking ───────────────────────────────────────────────────────
  const eyeOffsetX = useSharedValue(0);
  const eyeOffsetY = useSharedValue(0);
  useEffect(() => {
    if (!lookAt || !position) {
      eyeOffsetX.value = withTiming(0, { duration: duration.normal });
      eyeOffsetY.value = withTiming(0, { duration: duration.normal });
      return;
    }
    const dx = lookAt.x - position.x;
    const dy = lookAt.y - position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const maxOffset = 4;
    const clampedX = (dx / dist) * maxOffset;
    const clampedY = (dy / dist) * maxOffset;
    eyeOffsetX.value = withTiming(clampedX, { duration: duration.slow });
    eyeOffsetY.value = withTiming(clampedY, { duration: duration.slow });
  }, [lookAt?.x, lookAt?.y]);

  // ── Animated styles ────────────────────────────────────────────────────
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: breathe.value },
      { translateY: bounceY.value },
      { rotate: `${tiltDeg.value}deg` },
    ],
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: eyeOffsetX.value },
      { translateY: eyeOffsetY.value },
    ],
  }));

  const mouthStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: mouthScale.value }],
  }));

  const emojiSize = size * 0.45;

  return (
    <View
      style={[styles.container, { width: size + 32, height: size + 32 }]}
      accessibilityLabel={`Zoey is ${state}`}
      accessibilityRole="image"
    >
      {/* Outer ring */}
      <Animated.View
        style={[
          styles.ring,
          ringAnimStyle,
          {
            width: size + 24,
            height: size + 24,
            borderRadius: (size + 24) / 2,
            borderColor: config.ringColor,
          },
        ]}
      />

      {/* Body */}
      <Animated.View
        style={[
          bodyStyle,
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: config.bgColor,
          },
        ]}
      >
        {/* Eyes layer (tracks lookAt point) */}
        <Animated.View style={eyeStyle}>
          {/* Mouth layer (scales with amplitude) */}
          <Animated.View style={mouthStyle}>
            {/*
             * TODO: Replace emoji with actual character art layers:
             *   - Base face (Image)
             *   - Eyes (Image, driven by eyeStyle)
             *   - Mouth (Image, driven by mouthStyle + state)
             *   - Body (Lottie, driven by state)
             */}
            <Text style={{ fontSize: emojiSize }}>{config.emoji}</Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── Backward-compatible re-export ──────────────────────────────────────────
// Existing components import ZoeyAvatar — map it to ZoeyCharacter.

export type ZoeyMood = "happy" | "excited" | "thinking" | "proud" | "concerned";

const MOOD_TO_STATE: Record<ZoeyMood, ZoeyState> = {
  happy: "idle",
  excited: "excited",
  thinking: "thinking",
  proud: "celebrating",
  concerned: "concerned",
};

export function ZoeyAvatar({
  size = 180,
  mood = "happy",
  talking = false,
}: {
  size?: number;
  mood?: ZoeyMood;
  talking?: boolean;
}) {
  const state: ZoeyState = talking ? "talking" : MOOD_TO_STATE[mood];
  return <ZoeyCharacter state={state} size={size} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 4,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
});
