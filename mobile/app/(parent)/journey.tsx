/**
 * Learning Journey — parent view of the child's full progression state.
 *
 * Shows zones unlocked, per-subject skill progress rings, streak calendar,
 * and a GPT-4o narrative summary of the child's progress arc.
 * Includes "Reset Learning Progress" option (preserves personal memory).
 */
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";

import { useChildStore } from "@/store/childStore";
import {
  fetchProgressionSummary,
  resetProgress,
  type ProgressionSummaryResponse,
} from "@/services/api/progression";
import { fetchStreak, type StreakResponse } from "@/services/api/streaks";
import { colors, radius, spacing, typography } from "@/theme";

const ZONE_LABELS: Record<string, { name: string; emoji: string }> = {
  readingForest:  { name: "Reading Forest",  emoji: "📖" },
  mathIsland:     { name: "Math Island",     emoji: "🏝️" },
  scienceLab:     { name: "Science Lab",     emoji: "🔬" },
  cultureCorner:  { name: "Culture Corner",  emoji: "🌍" },
  feelingField:   { name: "Feeling Field",   emoji: "🌸" },
};

const SUBJECT_LABELS: Record<string, string> = {
  reading: "Reading",
  math: "Math",
  science: "Science",
  social_studies: "Culture",
  sel: "SEL",
};

// ── Progress ring (simplified — circular indicator) ─────────────────────────

function ProgressRing({
  label,
  mastered,
  total,
  color,
}: {
  label: string;
  mastered: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <View style={styles.ring}>
      <View style={[styles.ringCircle, { borderColor: color }]}>
        <Text style={[styles.ringPct, { color }]}>{pct}%</Text>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
      <Text style={styles.ringDetail}>{mastered}/{total} skills</Text>
    </View>
  );
}

const RING_COLORS: Record<string, string> = {
  reading: colors.sky,
  math: colors.sunflower,
  science: colors.mint,
  social_studies: colors.peach,
  sel: colors.lavender,
};

// ── Screen ──────────────────────────────────────────────────────────────────

export default function JourneyScreen() {
  const activeChild = useChildStore((s) => s.activeChild);
  const childId = activeChild?.id ?? "dev-child";
  const childName = activeChild?.name ?? "friend";
  const childAge = activeChild?.age ?? 5;

  const [summary, setSummary] = useState<ProgressionSummaryResponse | null>(null);
  const [streakData, setStreakData] = useState<StreakResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [data, streak] = await Promise.all([
        fetchProgressionSummary(childId, childName, childAge),
        fetchStreak(childId).catch(() => null),
      ]);
      setSummary(data);
      setStreakData(streak);
    } catch {
      // silent
    }
    setLoading(false);
  }, [childId, childName, childAge]);

  useEffect(() => { load(); }, [load]);

  const handleReset = useCallback(() => {
    Alert.alert(
      "Reset Learning Progress?",
      "This will reset all skill progress, zone unlocks, and session history. " +
        "Zoey's personal memory (favorite things, family mentions) will be preserved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Progress",
          style: "destructive",
          onPress: async () => {
            await resetProgress(childId).catch(() => {});
            await load();
          },
        },
      ],
    );
  }, [childId, load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "Learning Journey" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.sky} />
        </View>
      </SafeAreaView>
    );
  }

  const prog = summary?.progression_state;
  const skills = summary?.skills_per_subject ?? {};

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Learning Journey" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Headline */}
        {summary && (
          <View style={styles.headlineCard}>
            <Text style={styles.headline}>{summary.headline}</Text>
            <Text style={styles.narrative}>{summary.narrative}</Text>
          </View>
        )}

        {/* Overall stats */}
        {prog && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{prog.total_skills_mastered ?? 0}</Text>
              <Text style={styles.statLabel}>Skills mastered</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{prog.total_sessions_completed ?? 0}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{streakData?.current_streak ?? 0}</Text>
              <Text style={styles.statLabel}>Day streak</Text>
            </View>
          </View>
        )}

        {/* Zones unlocked */}
        {prog?.zones_unlocked && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zones Unlocked</Text>
            <View style={styles.zonesRow}>
              {(prog.zones_unlocked as string[]).map((z) => {
                const info = ZONE_LABELS[z];
                return (
                  <View key={z} style={styles.zoneBadge}>
                    <Text style={styles.zoneEmoji}>{info?.emoji ?? "🗺️"}</Text>
                    <Text style={styles.zoneName}>{info?.name ?? z}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Per-subject progress rings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills by Subject</Text>
          <View style={styles.ringsRow}>
            {Object.entries(skills).map(([subj, data]) => (
              <ProgressRing
                key={subj}
                label={SUBJECT_LABELS[subj] ?? subj}
                mastered={data.mastered}
                total={data.total}
                color={RING_COLORS[subj] ?? colors.charcoal}
              />
            ))}
          </View>
        </View>

        {/* Reset */}
        <Pressable onPress={handleReset} style={styles.resetBtn}>
          <Text style={styles.resetBtnText}>Reset Learning Progress</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxxl },

  // Headline card
  headlineCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headline: {
    ...typography.parentHeading,
    color: colors.softBlack,
    fontSize: 18,
  },
  narrative: {
    ...typography.parentBody,
    color: colors.charcoal,
    lineHeight: 24,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  stat: { alignItems: "center", gap: 2 },
  statNumber: {
    ...typography.parentHeading,
    fontSize: 28,
    color: colors.sky,
  },
  statLabel: {
    ...typography.parentCaption,
    color: colors.midGray,
  },

  // Sections
  section: { gap: spacing.sm },
  sectionTitle: {
    ...typography.parentHeading,
    color: colors.softBlack,
  },

  // Zones
  zonesRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  zoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  zoneEmoji: { fontSize: 18 },
  zoneName: { ...typography.parentCaption, fontWeight: "600", color: colors.softBlack },

  // Progress rings
  ringsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: spacing.md,
  },
  ring: { alignItems: "center", gap: 4, width: 70 },
  ringCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  ringPct: { fontWeight: "800", fontSize: 16 },
  ringLabel: { ...typography.parentCaption, fontWeight: "600", color: colors.softBlack },
  ringDetail: { ...typography.parentCaption, color: colors.midGray, fontSize: 11 },

  // Reset
  resetBtn: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: "center",
  },
  resetBtnText: { ...typography.parentBody, color: colors.error, fontWeight: "600" },
});
