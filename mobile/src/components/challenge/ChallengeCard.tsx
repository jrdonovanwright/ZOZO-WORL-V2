/**
 * ChallengeCard — shows the weekly Zoey challenge with a step progress tracker.
 *
 * Collapsed: title, badge, progress dots.
 * Expanded: full step list with day labels and completion state.
 * All-complete: celebration animation (badge pulse + sparkle).
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import type { WeeklyChallenge } from "@/services/api/challenges";
import { colors, radius, spacing, typography } from "@/theme";

interface ChallengeCardProps {
  challenge: WeeklyChallenge;
  completedCount: number;
  isCompleted: boolean;
}

// ── Step dot ────────────────────────────────────────────────────────────────

function StepDot({ completed, day }: { completed: boolean; day: string }) {
  const dayAbbrev = day.slice(0, 1); // M T W T F

  return (
    <View style={styles.stepDot}>
      <View
        style={[
          styles.dot,
          completed ? styles.dotCompleted : styles.dotPending,
        ]}
      >
        <Text style={[styles.dotCheck, !completed && styles.dotCheckPending]}>
          {completed ? "✓" : dayAbbrev}
        </Text>
      </View>
    </View>
  );
}

// ── Step row (expanded view) ────────────────────────────────────────────────

function StepRow({
  day,
  description,
  activityType,
  completed,
}: {
  day: string;
  description: string;
  activityType: string;
  completed: boolean;
}) {
  const typeEmoji =
    activityType === "lesson" ? "📖" : activityType === "conversation" ? "💬" : "🎮";

  return (
    <View style={[styles.stepRow, completed && styles.stepRowCompleted]}>
      <View style={styles.stepLeft}>
        <Text style={styles.stepDay}>{day}</Text>
        <Text style={styles.stepType}>{typeEmoji}</Text>
      </View>
      <Text
        style={[styles.stepDesc, completed && styles.stepDescCompleted]}
        numberOfLines={2}
      >
        {description}
      </Text>
      {completed && <Text style={styles.stepDone}>✅</Text>}
    </View>
  );
}

// ── Badge celebration ───────────────────────────────────────────────────────

function CelebrationBadge({ emoji }: { emoji: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.celebrationContainer}>
      <Animated.Text style={[styles.celebrationBadge, style]}>
        {emoji}
      </Animated.Text>
      <Text style={styles.celebrationText}>Challenge complete!</Text>
    </View>
  );
}

// ── Main card ───────────────────────────────────────────────────────────────

export function ChallengeCard({
  challenge,
  completedCount,
  isCompleted,
}: ChallengeCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Press scale
  const pressScale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        onPressIn={() => {
          pressScale.value = withSpring(0.97);
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1);
        }}
        style={[styles.card, isCompleted && styles.cardCompleted]}
        accessibilityRole="button"
        accessibilityLabel={`Weekly challenge: ${challenge.challenge_title}. ${completedCount} of ${challenge.steps.length} steps done.`}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.badge}>{challenge.reward_badge}</Text>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {challenge.challenge_title}
              </Text>
              <Text style={styles.subtitle}>
                {isCompleted
                  ? "Complete! 🎉"
                  : `${completedCount}/${challenge.steps.length} steps done`}
              </Text>
            </View>
          </View>
          <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
        </View>

        {/* Progress dots — always visible */}
        <View style={styles.dotsRow}>
          {challenge.steps.map((step, i) => (
            <StepDot key={i} completed={step.completed} day={step.day} />
          ))}
        </View>

        {/* Expanded: description + step list */}
        {expanded && (
          <>
            <Text style={styles.description}>{challenge.description}</Text>

            <View style={styles.stepsContainer}>
              {challenge.steps.map((step, i) => (
                <StepRow
                  key={i}
                  day={step.day}
                  description={step.description}
                  activityType={step.activity_type}
                  completed={step.completed}
                />
              ))}
            </View>
          </>
        )}

        {/* Celebration for completion */}
        {isCompleted && expanded && (
          <CelebrationBadge emoji={challenge.reward_badge} />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardCompleted: {
    borderColor: colors.sunflower,
    backgroundColor: "#FFFEF5",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  badge: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontSize: 18,
    fontWeight: "700",
    color: colors.softBlack,
  },
  subtitle: {
    ...typography.caption,
    color: colors.midGray,
  },
  chevron: {
    fontSize: 12,
    color: colors.midGray,
    paddingLeft: spacing.sm,
  },

  // Progress dots
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  stepDot: {
    alignItems: "center",
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCompleted: {
    backgroundColor: colors.success,
  },
  dotPending: {
    backgroundColor: colors.lightGray,
  },
  dotCheck: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  dotCheckPending: {
    color: colors.midGray,
    fontSize: 12,
  },

  // Expanded
  description: {
    ...typography.body,
    fontSize: 16,
    color: colors.charcoal,
    lineHeight: 24,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },

  // Steps
  stepsContainer: {
    gap: spacing.xs,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  stepRowCompleted: {
    backgroundColor: "#F0FAF0",
  },
  stepLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 80,
  },
  stepDay: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.softBlack,
    width: 55,
  },
  stepType: {
    fontSize: 14,
  },
  stepDesc: {
    ...typography.caption,
    color: colors.charcoal,
    flex: 1,
    lineHeight: 20,
  },
  stepDescCompleted: {
    color: colors.midGray,
    textDecorationLine: "line-through",
  },
  stepDone: {
    fontSize: 16,
  },

  // Celebration
  celebrationContainer: {
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  celebrationBadge: {
    fontSize: 48,
  },
  celebrationText: {
    ...typography.heading,
    fontSize: 20,
    color: colors.sunflower,
  },
});
