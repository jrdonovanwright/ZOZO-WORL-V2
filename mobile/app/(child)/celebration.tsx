/**
 * CelebrationScreen — cinematic skill mastery moment.
 *
 * 5 choreographed layers rendered simultaneously:
 *   1. Animated gradient background (zone colors sweep)
 *   2. Confetti particle burst (kente colors)
 *   3. Zoey celebrating (center, 1.4x scale)
 *   4. Badge drop with spring bounce
 *   5. Staggered word-by-word text reveal
 *
 * Performance target: first frame within 300ms of navigation.
 * Auto-dismisses after 6 seconds or on tap.
 *
 * Route params:
 *   badge    — emoji string for the mastery badge
 *   skill    — human-readable skill name ("Letter B sounds")
 *   zone     — subjectId for zone-specific color theme
 *   script   — Zoey's celebration line
 */
import { useCallback, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ZoeyCharacter } from "@/components/zoey/ZoeyCharacter";
import { ParticleSystem } from "@/components/effects/ParticleSystem";
import { palette, colors } from "@/design/tokens";
import { shadows } from "@/design/shadows";
import { spring, duration, stagger } from "@/design/animations";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { audioManager } from "@/services/audio/AudioManager";

// ─── Zone color themes ──────────────────────────────────────────────────────

const ZONE_THEMES: Record<string, { bg1: string; bg2: string; accent: string }> = {
  reading:        { bg1: palette.earth[400], bg2: palette.gold[400],  accent: palette.earth[600] },
  math:           { bg1: palette.sky[400],   bg2: palette.royal[400], accent: palette.sky[600]   },
  science:        { bg1: palette.mint[300],  bg2: palette.sky[400],   accent: palette.mint[500]  },
  social_studies: { bg1: palette.peach[300], bg2: palette.gold[400],  accent: palette.earth[500] },
  sel:            { bg1: palette.lavender[300], bg2: palette.peach[300], accent: palette.royal[400] },
};

const CONFETTI_COLORS = [
  palette.gold[400],
  palette.kente.red,
  palette.kente.green,
  palette.royal[400],
  palette.cream[50],
];

// ─── Staggered word component ───────────────────────────────────────────────

function StaggeredWord({ word, index }: { word: string; index: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const delay = 1800 + index * stagger.word; // start after badge lands
    opacity.value = withDelay(delay, withTiming(1, { duration: duration.fast }));
    translateY.value = withDelay(
      delay,
      withSpring(0, spring.snappy),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.word, style]}>
      {word}{" "}
    </Animated.Text>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

export default function CelebrationScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const params = useLocalSearchParams<{
    badge: string;
    skill: string;
    zone: string;
    script: string;
  }>();

  const badge = params.badge ?? "🌟";
  const skill = params.skill ?? "this skill";
  const zone = params.zone ?? "reading";
  const script = params.script ?? `Amazing work mastering ${skill}!`;
  const theme = ZONE_THEMES[zone] ?? ZONE_THEMES.reading;

  const words = useMemo(() => script.split(" "), [script]);

  // ── Haptic on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // ── Auto-dismiss after 6s ───────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (router.canGoBack()) router.back();
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, [router]);

  // ── Layer 1: Gradient background sweep ─────────────────────────────────
  const bgOpacity1 = useSharedValue(1);
  const bgOpacity2 = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    bgOpacity1.value = withDelay(
      1000,
      withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
    );
    bgOpacity2.value = withDelay(
      1000,
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
    );
  }, []);

  const bg1Style = useAnimatedStyle(() => ({
    opacity: bgOpacity1.value,
    backgroundColor: theme.bg1,
  }));
  const bg2Style = useAnimatedStyle(() => ({
    opacity: bgOpacity2.value,
    backgroundColor: theme.bg2,
  }));

  // ── Layer 4: Badge drop with spring bounce ────────────────────────────
  const badgeY = useSharedValue(-200);
  const badgeScale = useSharedValue(0.5);
  const badgeRotate = useSharedValue(0);
  const badgeGlow = useSharedValue(0);

  useEffect(() => {
    // Badge drops in after 800ms
    badgeY.value = withDelay(800, withSpring(0, spring.heavy));
    badgeScale.value = withDelay(800, withSpring(1, spring.bouncy));

    // Slow continuous rotation after landing
    setTimeout(() => {
      badgeRotate.value = withTiming(360, {
        duration: 20000,
        easing: Easing.linear,
      });
      // Glow pulse
      badgeGlow.value = withDelay(
        0,
        withTiming(1, { duration: 600 }),
      );
    }, 1800);
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: badgeY.value },
      { scale: badgeScale.value },
      { rotate: `${badgeRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: badgeGlow.value * 0.4,
    transform: [{ scale: 1 + badgeGlow.value * 0.3 }],
  }));

  return (
    <Pressable style={styles.screen} onPress={handleDismiss}>
      {/* Layer 1 — Background gradient sweep */}
      <Animated.View style={[styles.bgLayer, bg1Style]} />
      <Animated.View style={[styles.bgLayer, bg2Style]} />

      {/* Layer 2 — Confetti particles */}
      {!reduceMotion && (
        <ParticleSystem
          count={50}
          shape="diamond"
          colors={CONFETTI_COLORS}
          speed={{ min: 200, max: 500 }}
          size={{ min: 6, max: 14 }}
          lifetime={{ min: 2000, max: 4000 }}
          emitFrom="area"
          area={{ width, height: height * 0.3 }}
          gravity={150}
          spread={120}
          stagger={20}
        />
      )}

      <SafeAreaView style={styles.content}>
        {/* Layer 3 — Zoey celebrating */}
        <Animated.View entering={FadeIn.delay(400).duration(600)} style={styles.zoeyContainer}>
          <ZoeyCharacter state="celebrating" size={180} />
        </Animated.View>

        {/* Layer 4 — Badge */}
        <View style={styles.badgeContainer}>
          {/* Glow behind badge */}
          <Animated.View style={[styles.badgeGlow, { backgroundColor: theme.accent }, glowStyle]} />
          <Animated.View style={badgeStyle}>
            <Text style={styles.badgeEmoji}>{badge}</Text>
          </Animated.View>
        </View>

        {/* Layer 5 — Staggered text */}
        <View style={styles.textContainer}>
          <View style={styles.wordRow}>
            {words.map((word, i) => (
              <StaggeredWord key={`${word}-${i}`} word={word} index={i} />
            ))}
          </View>

          <Animated.Text
            entering={FadeIn.delay(2500).duration(600)}
            style={styles.skillLabel}
          >
            {skill}
          </Animated.Text>
        </View>

        {/* Tap to continue hint */}
        <Animated.Text
          entering={FadeIn.delay(4000).duration(600)}
          style={styles.tapHint}
        >
          Tap anywhere to continue
        </Animated.Text>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  zoeyContainer: {
    marginBottom: 8,
  },
  badgeContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 100,
  },
  badgeGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  badgeEmoji: {
    fontSize: 72,
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  wordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  word: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.cream[50],
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  skillLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: palette.cream[200],
    marginTop: 8,
  },
  tapHint: {
    position: "absolute",
    bottom: 40,
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
});
