/**
 * World Map — the child's home screen.
 *
 * Zoey greets the child by name on every session start (GPT-4o greeting,
 * ElevenLabs TTS). Five themed zones are arranged on an animated map;
 * the AI-recommended zone pulses with a gold glow. Tapping any zone
 * navigates to that subject's game screen.
 *
 * Also renders the streak garden plant (animated 7-stage growth) and
 * the weekly Zoey challenge card with step progress tracker.
 *
 * Load order:
 *   1. Zone progress fetched from Firebase in parallel (fast — map shows immediately)
 *   2. AI greeting generated + TTS synthesized (2–4 s — speech bubble animates in)
 *   3. Streak fetched + commentary TTS played (non-blocking)
 *   4. Weekly challenge fetched / auto-generated (non-blocking)
 */
import { useCallback, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ZoeyAvatar } from "@/components/zoey/ZoeyAvatar";
import { ZoneCard, type ZoneMeta } from "@/components/world/ZoneCard";
import { StreakPlant } from "@/components/streak/StreakPlant";
import { ChallengeCard } from "@/components/challenge/ChallengeCard";
import { ResumePrompt } from "@/components/session/ResumePrompt";
import { BackendDown } from "@/components/ui/BackendDown";
import { useWorldMap, WORLD_ZONE_IDS } from "@/hooks/useWorldMap";
import { useStreak } from "@/hooks/useStreak";
import { useWeeklyChallenge } from "@/hooks/useWeeklyChallenge";
import { useSessionResume } from "@/hooks/useSessionResume";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { useChildStore } from "@/store/childStore";
import { useSessionStore } from "@/store/sessionStore";
import { audioManager } from "@/services/audio/AudioManager";
import { hasSeenLesson } from "@/utils/lessonSeen";
import { colors, spacing, typography, MIN_TAP_TARGET, radius } from "@/theme";
import type { SubjectId } from "../../../shared/types";

// ─── Zone metadata ────────────────────────────────────────────────────────────
// Maps each zone subject to its visual theme and world-map persona.

const ZONE_META: Record<SubjectId, ZoneMeta> = {
  reading: {
    subjectId: "reading",
    name: "Reading Forest",
    emoji: "🌲",
    colorKey: "sky",
    tagline: "Stories & letters",
    decor: ["📖", "🦋"],
  },
  math: {
    subjectId: "math",
    name: "Math Island",
    emoji: "🏝️",
    colorKey: "sunflower",
    tagline: "Numbers & shapes",
    decor: ["⭐", "🌊"],
  },
  science: {
    subjectId: "science",
    name: "Science Lab",
    emoji: "🔬",
    colorKey: "mint",
    tagline: "Explore & discover",
    decor: ["🧪", "🌱"],
  },
  social_studies: {
    subjectId: "social_studies",
    name: "Culture Corner",
    emoji: "🌍",
    colorKey: "peach",
    tagline: "History & community",
    decor: ["✨", "🎭"],
  },
  sel: {
    subjectId: "sel",
    name: "Feeling Field",
    emoji: "🌸",
    colorKey: "lavender",
    tagline: "Feelings & kindness",
    decor: ["💛", "🌈"],
  },
  // arts and health are not world-map zones in the current release
  arts: {
    subjectId: "arts",
    name: "Art Studio",
    emoji: "🎨",
    colorKey: "coral",
    tagline: "Colors & creativity",
    decor: ["🖌️", "🌟"],
  },
  health: {
    subjectId: "health",
    name: "Health Hub",
    emoji: "🥦",
    colorKey: "mint",
    tagline: "Food & movement",
    decor: ["💪", "🏃"],
  },
};

// Float delay per zone so they bob at different phases
const FLOAT_DELAYS: Record<SubjectId, number> = {
  reading:        0,
  math:         400,
  science:      800,
  social_studies: 200,
  sel:          600,
  arts:           0,
  health:         0,
};

// ─── Speech bubble with fade-in ──────────────────────────────────────────────

function SpeechBubble({
  text,
  visible,
  onReplay,
}: {
  text: string;
  visible: boolean;
  onReplay: () => void;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 500 });
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.bubble, animStyle]}>
      <Text style={styles.bubbleText}>{text}</Text>
      <Pressable
        onPress={onReplay}
        hitSlop={12}
        accessibilityLabel="Replay Zoey's greeting"
        accessibilityRole="button"
        style={styles.replayButton}
      >
        <Text style={styles.replayEmoji}>🔊</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Greeting placeholder (while AI thinks) ──────────────────────────────────

function GreetingLoading() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    // staggered start — tiny delay trick using initial value
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 }),
      ),
      -1,
    );
    setTimeout(() => {
      dot2.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
      );
    }, 150);
    setTimeout(() => {
      dot3.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
      );
    }, 300);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={[styles.bubble, styles.bubbleLoading]}>
      <Animated.Text style={[styles.dotText, s1]}>●</Animated.Text>
      <Animated.Text style={[styles.dotText, s2]}>●</Animated.Text>
      <Animated.Text style={[styles.dotText, s3]}>●</Animated.Text>
    </View>
  );
}

// ─── World Map screen ─────────────────────────────────────────────────────────

export default function WorldMapScreen() {
  const router = useRouter();
  const activeChild = useChildStore((s) => s.activeChild);
  const { isDown, isChecking, retry } = useBackendHealth();

  const childId   = activeChild?.id   ?? "dev-child";
  const childName = activeChild?.name ?? "friend";
  const childAge  = activeChild?.age  ?? 5;

  const { zones, progressLoaded, setRecommendedZone } = useWorldMap(childId);

  const { streak } = useStreak({ childId, childName });

  const { challenge, completedCount, totalSteps, isCompleted: challengeCompleted } =
    useWeeklyChallenge({ childId, childName, childAge });

  // Session context provides the greeting, recommendation, and resume state.
  // This is the single greeting system — useWorldMap no longer fetches its own.
  const { resumeCase, context, activeSession, keepGoing, startFresh } = useSessionResume();

  const showResume = resumeCase === "resume" || resumeCase === "resume-light";
  const greetingLoaded = !!context;
  const greetingText = context?.zoey_opening_script ?? null;

  // Mark the recommended zone once session context resolves
  useEffect(() => {
    if (context?.recommended_zone) {
      setRecommendedZone(context.recommended_zone);
    }
  }, [context?.recommended_zone, setRecommendedZone]);

  // Replay greeting TTS via the session context URL
  const replayGreeting = useCallback(() => {
    if (context?.tts_url) {
      audioManager.playVoice(context.tts_url).catch(() => {});
    }
  }, [context?.tts_url]);

  // All hooks must be above this line — React requires consistent hook call order.
  const recordZoneVisit = useSessionStore((s) => s.recordZoneVisit);

  // Show friendly offline screen if backend is unreachable
  if (isDown) {
    return <BackendDown isChecking={isChecking} onRetry={retry} />;
  }

  const handleZonePress = useCallback((subjectId: SubjectId) => {
    console.log("[WorldMap] Zone tapped:", subjectId);
    // DEBUG: navigate to static test screen to isolate if the crash is
    // in routing vs in the game screen. Change back to game/${subjectId}
    // once this works.
    router.push("/(child)/test" as any);
  }, [router]);

  const handleParentPress = () => {
    router.push("/(parent)/dashboard");
  };

  // Zoey's mood: "thinking" while greeting loads, "happy" once ready
  const zoeyMood = greetingLoaded ? "happy" : "thinking";

  return (
    <SafeAreaView style={styles.safe}>
      {/* Parent settings — unobtrusive top-right */}
      <Pressable
        onPress={handleParentPress}
        style={styles.parentButton}
        accessibilityLabel="Parent settings"
        accessibilityRole="button"
        hitSlop={16}
      >
        <Text style={styles.parentIcon}>⚙️</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sky strip ─────────────────────────────────────────────── */}
        <View style={styles.sky}>
          <Text style={styles.cloud}>☁️</Text>
          <Text style={[styles.cloud, styles.cloudRight]}>⛅</Text>
          <Text style={[styles.cloud, styles.cloudFar]}>☁️</Text>
        </View>

        {/* ── Zoey + greeting ──────────────────────────────────────── */}
        <View style={styles.zoeySection}>
          <ZoeyAvatar size={110} mood={zoeyMood} talking={!greetingLoaded} />

          <View style={styles.bubbleWrapper}>
            {greetingLoaded && greetingText ? (
              <SpeechBubble
                text={greetingText}
                visible={greetingLoaded}
                onReplay={replayGreeting}
              />
            ) : (
              <GreetingLoading />
            )}
          </View>
        </View>

        {/* ── Streak garden ────────────────────────────────────────── */}
        {streak && (
          <View style={styles.streakSection}>
            <StreakPlant
              plantStage={streak.plant_stage}
              isAtRisk={streak.streak_status === "at-risk"}
              streakCount={streak.current_streak}
            />
          </View>
        )}

        {/* ── Map title ─────────────────────────────────────────────── */}
        <Text style={styles.mapTitle}>🗺️ Your World</Text>

        {/* ── Zone grid ─────────────────────────────────────────────── */}
        {progressLoaded ? (
          <View style={styles.mapGrid}>
            {/* Row 1: Reading + Math */}
            <View style={styles.mapRow}>
              {(["reading", "math"] as SubjectId[]).map((id) => {
                const zone = zones.find((z) => z.subjectId === id)!;
                return (
                  <ZoneCard
                    key={id}
                    zone={ZONE_META[id]}
                    state={zone}
                    floatDelay={FLOAT_DELAYS[id]}
                    onPress={() => handleZonePress(id)}
                  />
                );
              })}
            </View>

            {/* Row 2: Science (center, slightly wider) */}
            <View style={styles.mapRowCenter}>
              <ZoneCard
                zone={ZONE_META["science"]}
                state={zones.find((z) => z.subjectId === "science")!}
                floatDelay={FLOAT_DELAYS["science"]}
                onPress={() => handleZonePress("science")}
                wide
              />
            </View>

            {/* Row 3: Culture Corner + Feeling Field */}
            <View style={styles.mapRow}>
              {(["social_studies", "sel"] as SubjectId[]).map((id) => {
                const zone = zones.find((z) => z.subjectId === id)!;
                return (
                  <ZoneCard
                    key={id}
                    zone={ZONE_META[id]}
                    state={zone}
                    floatDelay={FLOAT_DELAYS[id]}
                    onPress={() => handleZonePress(id)}
                  />
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={colors.charcoal} />
          </View>
        )}

        {/* ── Weekly challenge card ─────────────────────────────────── */}
        {challenge && (
          <View style={styles.challengeSection}>
            <ChallengeCard
              challenge={challenge}
              completedCount={completedCount}
              isCompleted={challengeCompleted}
            />
          </View>
        )}

        {/* ── Decorative ground ─────────────────────────────────────── */}
        <View style={styles.ground}>
          <Text style={styles.groundEmoji}>🌿</Text>
          <Text style={styles.groundEmoji}>🌸</Text>
          <Text style={styles.groundEmoji}>🍀</Text>
          <Text style={styles.groundEmoji}>🌺</Text>
          <Text style={styles.groundEmoji}>🌿</Text>
        </View>
      </ScrollView>
      {/* ── Session resume prompt (overlay) ──────────────────────── */}
      {showResume && context && (
        <ResumePrompt
          resumeCase={resumeCase}
          openingScript={context.zoey_opening_script}
          ttsUrl={context.tts_url}
          skillLabel={activeSession?.current_skill_id ?? null}
          onKeepGoing={keepGoing}
          onStartFresh={startFresh}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  parentButton: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
    alignItems: "center",
    justifyContent: "center",
  },
  parentIcon: {
    fontSize: 24,
  },
  scroll: {
    alignItems: "center",
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },

  // Sky strip
  sky: {
    width: "100%",
    height: 60,
    backgroundColor: "#E8F4FD",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  cloud: {
    position: "absolute",
    top: 10,
    left: 40,
    fontSize: 32,
  },
  cloudRight: {
    left: undefined,
    right: 60,
    top: 6,
    fontSize: 40,
  },
  cloudFar: {
    left: "40%",
    top: 14,
    fontSize: 26,
    opacity: 0.7,
  },

  // Zoey + greeting
  zoeySection: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    width: "100%",
  },
  bubbleWrapper: {
    flex: 1,
    marginTop: spacing.sm,
  },

  // Speech bubble
  bubble: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderTopLeftRadius: radius.sm,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  bubbleLoading: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    gap: 6,
  },
  bubbleText: {
    ...typography.body,
    fontSize: 18,
    color: colors.softBlack,
    flex: 1,
    lineHeight: 26,
  },
  replayButton: {
    marginTop: 2,
  },
  replayEmoji: {
    fontSize: 20,
  },
  dotText: {
    fontSize: 16,
    color: colors.midGray,
  },

  // Map
  mapTitle: {
    ...typography.heading,
    color: colors.softBlack,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.lg,
  },
  mapGrid: {
    width: "100%",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  mapRow: {
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "center",
  },
  mapRowCenter: {
    alignItems: "center",
  },
  mapLoading: {
    height: 400,
    justifyContent: "center",
    alignItems: "center",
  },

  // Streak
  streakSection: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },

  // Challenge
  challengeSection: {
    width: "100%",
    paddingHorizontal: spacing.md,
  },

  // Ground
  ground: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
    paddingTop: spacing.sm,
    opacity: 0.6,
  },
  groundEmoji: {
    fontSize: 24,
  },
});
