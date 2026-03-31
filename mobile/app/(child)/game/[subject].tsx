/**
 * Game screen — the adaptive learning experience.
 *
 * One screen handles all 7 subjects. The subject is passed as a route param.
 * Zoey reads every question aloud via TTS. Children interact only by tapping.
 *
 * Flow per question:
 *   1. Question loads (loading state)
 *   2. Zoey reads question aloud (speaking state) — choices shown but greyed
 *   3. Child taps a choice (answering state)
 *   4. Zoey plays feedback audio (correct / wrong state)
 *   5a. Every 3rd answer: AI advisor may insert a coaching moment:
 *       scaffold → Zoey speaks a hint (hinting state), then next question loads
 *       challenge → Level-up banner plays, then next question loads
 *       encourage → no interruption, straight to next question
 *   5b. Every 5th answer: threshold engine may change level (levelup state)
 *   6. Next question auto-loads (prefetched during step 4)
 *   7. After SESSION_LENGTH questions → complete screen
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ZoeyAvatar } from "@/components/zoey/ZoeyAvatar";
import { ZoeyLoading } from "@/components/ui/ZoeyLoading";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ChoiceButton, type ChoiceState } from "@/components/game/ChoiceButton";
import { FeedbackOverlay } from "@/components/game/FeedbackOverlay";
import { SessionProgress } from "@/components/game/SessionProgress";
import { useGameSession, SESSION_LENGTH } from "@/hooks/useGameSession";
import { useChildStore } from "@/store/childStore";
import { colors, MIN_TAP_TARGET, radius, spacing, typography } from "@/theme";

import { SUBJECTS } from "../../../../shared/constants/subjects";
import type { SubjectId } from "../../../../shared/types";

function zoeyMoodForStatus(status: string) {
  switch (status) {
    case "correct":  return "excited" as const;
    case "wrong":    return "concerned" as const;
    case "loading":  return "thinking" as const;
    case "hinting":  return "thinking" as const;
    case "levelup":  return "proud" as const;
    default:         return "happy" as const;
  }
}

export default function GameScreenWrapper() {
  console.log("[GameScreen] Wrapper rendering");
  return (
    <ErrorBoundary>
      <GameScreen />
    </ErrorBoundary>
  );
}

function GameScreen() {
  console.log("[GameScreen] Component rendering");
  const router = useRouter();
  const params = useLocalSearchParams<{ subject: string }>();
  const subject = params.subject;
  console.log("[GameScreen] subject param:", subject);
  const subjectId = (subject ?? "math") as SubjectId;
  const subjectMeta = SUBJECTS[subjectId];
  console.log("[GameScreen] subjectMeta:", subjectMeta?.label ?? "MISSING");

  const activeChild = useChildStore((s) => s.activeChild);
  const childId   = activeChild?.id   ?? "dev-child";
  const childName = activeChild?.name ?? "friend";
  const childAge  = activeChild?.age  ?? 5;

  const {
    status,
    question,
    selectedId,
    sessionCount,
    sessionCorrect,
    currentLevel,
    newLevel,
    levelChangeDirection,
    zoeyHintMessage,
    handleAnswer,
    retry,
  } = useGameSession({
    childId,
    childName,
    childAge,
    subjectId,
    startLevel: 1,
  });

  // Determine per-choice visual state
  function choiceState(choiceId: string): ChoiceState {
    if (status === "loading" || status === "speaking" || status === "hinting") return "disabled";
    if (!selectedId) return "default";
    if (choiceId === question?.correct_id) return "correct";
    if (choiceId === selectedId) return "wrong";
    return "disabled";
  }

  const bgColor =
    (colors[subjectMeta?.colorKey as keyof typeof colors] as string) ?? colors.lavender;

  // -----------------------------------------------------------------------
  // Complete screen
  // -----------------------------------------------------------------------
  if (status === "complete") {
    const accuracy = sessionCount > 0 ? Math.round((sessionCorrect / sessionCount) * 100) : 0;
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <View style={styles.completeContainer}>
          <ZoeyAvatar size={140} mood="proud" />
          <Text style={styles.completeTitle}>Amazing work! 🎉</Text>
          <Text style={styles.completeBody}>
            You answered {sessionCorrect} out of {sessionCount} questions!
          </Text>
          {subjectMeta?.scored && (
            <Text style={styles.accuracyText}>{accuracy}% accuracy</Text>
          )}
          <Pressable
            onPress={() => router.replace("/(child)/")}
            style={styles.doneButton}
            accessibilityRole="button"
          >
            <Text style={styles.doneButtonText}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------------------------
  // Error screen
  // -----------------------------------------------------------------------
  if (status === "error") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.completeContainer}>
          <ZoeyAvatar size={120} mood="concerned" />
          <Text style={styles.completeTitle}>Oops!</Text>
          <Text style={styles.completeBody}>
            Zoey had trouble getting the next question. Let's try again!
          </Text>
          <Pressable onPress={retry} style={styles.doneButton} accessibilityRole="button">
            <Text style={styles.doneButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------------------------
  // Main game screen
  // -----------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          accessibilityLabel="Leave game"
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <View style={[styles.subjectBadge, { backgroundColor: bgColor }]}>
          <Text style={styles.subjectEmoji}>{subjectMeta?.emoji}</Text>
          <Text style={styles.subjectLabel}>{subjectMeta?.label}</Text>
          <Text style={styles.levelLabel}>Lv {currentLevel}</Text>
        </View>

        <View style={styles.backButton} />
      </View>

      {/* Progress dots */}
      <SessionProgress current={sessionCount} />

      {/* Zoey + question prompt */}
      <View style={styles.body}>
        <ZoeyAvatar
          size={130}
          mood={zoeyMoodForStatus(status)}
          talking={status === "speaking" || status === "hinting"}
        />

        <View style={styles.promptBubble}>
          {status === "loading" && !question ? (
            <ZoeyLoading size="small" message="Zoey is thinking of a question..." />
          ) : status === "loading" ? (
            <ActivityIndicator color={colors.charcoal} />
          ) : (
            <Text style={styles.promptText}>
              {question?.prompt ?? ""}
            </Text>
          )}
        </View>
      </View>

      {/* Scaffold hint — Zoey coaching mid-game before next question */}
      {status === "hinting" && zoeyHintMessage && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintEmoji}>💡</Text>
          <Text style={styles.hintText}>{zoeyHintMessage}</Text>
        </View>
      )}

      {/* Level-up announcement */}
      {status === "levelup" && newLevel !== null && (
        <View style={[
          styles.levelUpBanner,
          levelChangeDirection === "down" && styles.levelDownBanner,
        ]}>
          <Text style={styles.levelUpEmoji}>
            {levelChangeDirection === "up" ? "⬆️" : "⬇️"}
          </Text>
          <Text style={styles.levelUpText}>
            {levelChangeDirection === "up" ? "Level Up!" : "Let's practice more!"}
          </Text>
          <Text style={styles.levelUpSubtext}>Now on Level {newLevel}</Text>
        </View>
      )}

      {/* Choices */}
      <ScrollView
        style={styles.choicesScroll}
        contentContainerStyle={styles.choicesContent}
        showsVerticalScrollIndicator={false}
      >
        {(question?.choices ?? []).map((choice) => (
          <ChoiceButton
            key={choice.id}
            id={choice.id}
            text={choice.text}
            emoji={choice.emoji}
            state={choiceState(choice.id)}
            onPress={handleAnswer}
          />
        ))}
      </ScrollView>

      {/* Feedback overlay */}
      <FeedbackOverlay
        visible={status === "correct" || status === "wrong"}
        isCorrect={status === "correct"}
        message={
          status === "correct"
            ? (question?.zoey_correct ?? "Great job!")
            : (question?.zoey_wrong ?? "Nice try! Let's keep going!")
        }
      />
    </SafeAreaView>
  );
}

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
  },
  subjectEmoji: { fontSize: 18 },
  subjectLabel: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.softBlack,
  },
  levelLabel: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.softBlack,
  },
  body: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  promptBubble: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: "100%",
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.softBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  promptText: {
    ...typography.body,
    color: colors.softBlack,
    textAlign: "center",
  },
  hintBanner: {
    backgroundColor: colors.sky,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hintEmoji: {
    fontSize: 24,
    marginTop: 2,
  },
  hintText: {
    ...typography.body,
    fontSize: 18,
    color: colors.softBlack,
    flex: 1,
    lineHeight: 26,
  },
  levelUpBanner: {
    backgroundColor: colors.sunflower,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  levelDownBanner: {
    backgroundColor: colors.lavender,
  },
  levelUpEmoji: {
    fontSize: 36,
  },
  levelUpText: {
    ...typography.displayMedium,
    color: colors.softBlack,
  },
  levelUpSubtext: {
    ...typography.body,
    color: colors.charcoal,
  },
  choicesScroll: {
    flex: 1,
  },
  choicesContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  // Complete / Error screens
  completeContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  completeTitle: {
    ...typography.displayMedium,
    color: colors.softBlack,
    textAlign: "center",
  },
  completeBody: {
    ...typography.body,
    color: colors.charcoal,
    textAlign: "center",
  },
  accuracyText: {
    ...typography.heading,
    color: colors.mint,
  },
  doneButton: {
    backgroundColor: colors.sunflower,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
  },
  doneButtonText: {
    ...typography.heading,
    color: colors.softBlack,
  },
});
