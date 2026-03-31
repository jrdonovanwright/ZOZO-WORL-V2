/**
 * Lesson screen — Zoey Explains micro-lesson.
 *
 * Receives route params:  subject (SubjectId), level (number as string)
 *
 * Flow:
 *   1. "loading"  → GPT-4o generates script + ElevenLabs synthesizes voice (3–8 s)
 *   2. "playing"  → Zoey speaks for 60–90 s; animated progress bar advances
 *                   Zoey's mood shifts: happy → excited → proud
 *                   Floating subject-themed emoji drift upward in the background
 *                   Lesson script visible as scrollable text beneath Zoey
 *   3. "complete" → Key concept shown + "Let's go!" button appears
 *   4. Tap "Let's go!" → mark lesson seen → navigate to follow-up activity
 *
 * A small "Skip" button is always visible so returning learners can bypass.
 */
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
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
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ZoeyAvatar } from "@/components/zoey/ZoeyAvatar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useLesson } from "@/hooks/useLesson";
import { useChildStore } from "@/store/childStore";
import { colors, MIN_TAP_TARGET, radius, spacing, typography } from "@/theme";
import { markLessonSeen } from "@/utils/lessonSeen";
import { SUBJECTS } from "../../../shared/constants/subjects";
import type { SubjectId } from "../../../shared/types";
import type { FollowUpActivityType } from "@/services/api/lesson";

// ─── Subject-themed floating emoji ──────────────────────────────────────────

const SUBJECT_DECOR: Record<string, string[]> = {
  reading:        ["📖", "🔤", "🌲", "🦋", "✨"],
  math:           ["🔢", "⭐", "🌊", "🏝️", "➕"],
  science:        ["🔬", "🌱", "💡", "🧪", "⚗️"],
  social_studies: ["🌍", "✊", "🎭", "🌟", "🤝"],
  sel:            ["💛", "🌈", "🤗", "🌸", "💚"],
  arts:           ["🎨", "🖌️", "🎵", "🌟", "🎭"],
  health:         ["🥦", "💪", "🏃", "🥕", "❤️"],
};

// ─── Floating emoji particle ─────────────────────────────────────────────────

function FloatingEmoji({ emoji, delay, x }: { emoji: string; delay: number; x: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-120, { duration: 3000, easing: Easing.out(Easing.quad) }),
          withTiming(0,    { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 400 }),
          withTiming(0.7, { duration: 2000 }),
          withTiming(0,   { duration: 600 }),
          withTiming(0,   { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
    position: "absolute",
    bottom: 0,
    left: x,
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      <Text style={styles.floatEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

// ─── Audio equalizer wave ─────────────────────────────────────────────────────
// Five bars that animate when Zoey is speaking.

function WaveBar({ delay, playing }: { delay: number; playing: boolean }) {
  const height = useSharedValue(8);

  useEffect(() => {
    if (playing) {
      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(28, { duration: 280, easing: Easing.inOut(Easing.sine) }),
            withTiming(8,  { duration: 280, easing: Easing.inOut(Easing.sine) }),
          ),
          -1,
          false,
        ),
      );
    } else {
      height.value = withTiming(8, { duration: 300 });
    }
  }, [playing]);

  const style = useAnimatedStyle(() => ({ height: height.value }));

  return <Animated.View style={[styles.waveBar, style]} />;
}

function WaveAnimation({ playing }: { playing: boolean }) {
  return (
    <View style={styles.wave}>
      {[0, 80, 160, 240, 320].map((delay, i) => (
        <WaveBar key={i} delay={delay} playing={playing} />
      ))}
    </View>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────

function ProgressBar({ progressValue }: { progressValue: ReturnType<typeof useSharedValue> }) {
  const fillStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

// ─── Routing helper ──────────────────────────────────────────────────────────

function followUpRoute(subjectId: SubjectId, activityType: FollowUpActivityType): string {
  switch (activityType) {
    case "conversation":
      // TODO: route to /(child)/conversation?subject=${subjectId} once built
      return `/(child)/game/${subjectId}`;
    case "read-aloud":
      // TODO: route to dedicated read-aloud screen once built
      return `/(child)/game/${subjectId}`;
    case "drag-drop":
      // TODO: route to drag-drop activity screen once built
      return `/(child)/game/${subjectId}`;
    case "multiple-choice":
    default:
      return `/(child)/game/${subjectId}`;
  }
}

// ─── Lesson screen ───────────────────────────────────────────────────────────

export default function LessonScreenWrapper() {
  console.log("[LessonScreen] Wrapper rendering");
  return (
    <ErrorBoundary>
      <LessonScreen />
    </ErrorBoundary>
  );
}

function LessonScreen() {
  console.log("[LessonScreen] Component rendering");
  const router = useRouter();
  const params = useLocalSearchParams<{ subject: string; level: string }>();
  const subjectId = (params.subject ?? "math") as SubjectId;
  const level = parseInt(params.level ?? "1", 10);
  const subjectMeta = SUBJECTS[subjectId];

  const activeChild = useChildStore((s) => s.activeChild);
  const childId   = activeChild?.id   ?? "dev-child";
  const childName = activeChild?.name ?? "friend";
  const childAge  = activeChild?.age  ?? 5;

  const { status, lesson, zoeyMood, progressValue, replay, skip } = useLesson({
    subjectId,
    level,
    childName,
    childAge,
  });

  const isPlaying  = status === "playing";
  const isLoading  = status === "loading";
  const isComplete = status === "complete";
  const isError    = status === "error";

  const bgColor = (colors[subjectMeta?.colorKey as keyof typeof colors] as string) ?? colors.lavender;
  const decor = SUBJECT_DECOR[subjectId] ?? ["✨", "⭐", "🌟"];

  const handleLetsGo = async () => {
    await markLessonSeen(childId, subjectId, level);
    const route = lesson
      ? followUpRoute(subjectId, lesson.follow_up_activity_type)
      : `/(child)/game/${subjectId}`;
    router.replace(route as any);
  };

  const handleSkip = async () => {
    skip();
    await markLessonSeen(childId, subjectId, level);
    router.replace(`/(child)/game/${subjectId}` as any);
  };

  // ── Error state ─────────────────────────────────────────────────────────
  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <ZoeyAvatar size={140} mood="concerned" />
          <Text style={styles.errorTitle}>Zoey's not ready yet!</Text>
          <Text style={styles.errorBody}>
            She's still getting the lesson together. Want to jump straight to the questions?
          </Text>
          <Pressable
            onPress={() => router.replace(`/(child)/game/${subjectId}` as any)}
            style={styles.letsGoButton}
            accessibilityRole="button"
          >
            <Text style={styles.letsGoText}>Go to Questions →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <View style={[styles.subjectBadge, { backgroundColor: bgColor }]}>
          <Text style={styles.subjectEmoji}>{subjectMeta?.emoji}</Text>
          <Text style={styles.subjectLabel}>{subjectMeta?.label}</Text>
          {lesson && (
            <Text style={styles.lessonTitle}> · {lesson.lesson_title}</Text>
          )}
        </View>

        <Pressable
          onPress={handleSkip}
          hitSlop={16}
          accessibilityLabel="Skip lesson"
          accessibilityRole="button"
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Floating emoji particles (only while playing) ──────── */}
        {isPlaying && (
          <View style={styles.particleField} pointerEvents="none">
            {decor.map((e, i) => (
              <FloatingEmoji
                key={i}
                emoji={e}
                delay={i * 600}
                x={40 + i * 55}
              />
            ))}
          </View>
        )}

        {/* ── Zoey + wave ─────────────────────────────────────────── */}
        <View style={styles.zoeySection}>
          <ZoeyAvatar
            size={isLoading ? 140 : 180}
            mood={isLoading ? "thinking" : zoeyMood}
            talking={isPlaying}
          />
          <WaveAnimation playing={isPlaying} />
        </View>

        {/* ── Loading state ──────────────────────────────────────── */}
        {isLoading && (
          <View style={styles.loadingBubble}>
            <Text style={styles.loadingText}>
              Zoey is getting ready to explain...
            </Text>
          </View>
        )}

        {/* ── Progress bar (playing + complete) ─────────────────── */}
        {(isPlaying || isComplete) && (
          <View style={styles.progressWrapper}>
            <ProgressBar progressValue={progressValue} />
            <Text style={styles.progressLabel}>
              {isPlaying
                ? `~${lesson?.estimated_duration_seconds ?? 75}s`
                : "Done!"}
            </Text>
          </View>
        )}

        {/* ── Lesson script ─────────────────────────────────────── */}
        {lesson && (isPlaying || isComplete) && (
          <View style={styles.scriptCard}>
            <Text style={styles.scriptText}>{lesson.script}</Text>
          </View>
        )}

        {/* ── Key concept (complete state) ──────────────────────── */}
        {isComplete && lesson?.key_concept && (
          <View style={[styles.keyConceptCard, { borderLeftColor: bgColor }]}>
            <Text style={styles.keyConceptLabel}>💡 Remember</Text>
            <Text style={styles.keyConceptText}>{lesson.key_concept}</Text>
          </View>
        )}

        {/* ── Replay button (playing + complete) ────────────────── */}
        {(isPlaying || isComplete) && lesson?.tts_url && (
          <Pressable
            onPress={replay}
            style={styles.replayButton}
            accessibilityLabel="Replay Zoey's explanation"
            accessibilityRole="button"
          >
            <Text style={styles.replayText}>🔊 Replay</Text>
          </Pressable>
        )}

        {/* ── Let's Go CTA (complete state) ─────────────────────── */}
        {isComplete && (
          <Pressable
            onPress={handleLetsGo}
            style={styles.letsGoButton}
            accessibilityRole="button"
          >
            <Text style={styles.letsGoText}>
              {lesson?.follow_up_activity_type === "conversation"
                ? "Let's talk! 💬"
                : lesson?.follow_up_activity_type === "read-aloud"
                  ? "Let's read! 📖"
                  : "Let's try it! 🚀"}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 28,
    color: colors.charcoal,
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    flex: 1,
    marginHorizontal: spacing.sm,
    justifyContent: "center",
  },
  subjectEmoji: { fontSize: 18 },
  subjectLabel: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.softBlack,
  },
  lessonTitle: {
    ...typography.caption,
    color: colors.charcoal,
    flexShrink: 1,
  },
  skipButton: {
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    ...typography.caption,
    color: colors.midGray,
    fontWeight: "600",
  },

  scroll: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },

  // Particles
  particleField: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    overflow: "hidden",
  },
  floatEmoji: {
    fontSize: 28,
  },

  // Zoey section
  zoeySection: {
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.lg,
  },

  // Wave equalizer
  wave: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 36,
  },
  waveBar: {
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.sunflower,
  },

  // Loading
  loadingBubble: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  loadingText: {
    ...typography.body,
    color: colors.charcoal,
    textAlign: "center",
  },

  // Progress
  progressWrapper: {
    width: "100%",
    gap: spacing.xs,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: radius.full,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.sunflower,
    borderRadius: radius.full,
  },
  progressLabel: {
    ...typography.caption,
    color: colors.midGray,
    textAlign: "right",
  },

  // Script
  scriptCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  scriptText: {
    ...typography.body,
    fontSize: 19,
    color: colors.softBlack,
    lineHeight: 30,
  },

  // Key concept
  keyConceptCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: "100%",
    borderLeftWidth: 4,
    gap: spacing.xs,
  },
  keyConceptLabel: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.charcoal,
  },
  keyConceptText: {
    ...typography.body,
    fontSize: 18,
    color: colors.softBlack,
  },

  // Controls
  replayButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.midGray,
  },
  replayText: {
    ...typography.body,
    fontSize: 18,
    color: colors.charcoal,
  },
  letsGoButton: {
    backgroundColor: colors.sunflower,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  letsGoText: {
    ...typography.heading,
    color: colors.softBlack,
  },

  // Error + center layouts
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorTitle: {
    ...typography.displayMedium,
    color: colors.softBlack,
    textAlign: "center",
  },
  errorBody: {
    ...typography.body,
    color: colors.charcoal,
    textAlign: "center",
  },
});
