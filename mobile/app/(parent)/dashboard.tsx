/**
 * Parent Dashboard — shows parent intelligence reports for their child's sessions.
 *
 * Fetches the 20 most recent reports from the backend and renders them as
 * expandable cards: summary always visible, strengths/areas/activity revealed on tap.
 */
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";

import { useAuthStore } from "@/store/authStore";
import { fetchReports, type StoredReport } from "@/services/api/reports";
import { colors, spacing, typography, radius } from "@/theme";

// ─── Zone display names ───────────────────────────────────────────────────────

const ZONE_NAMES: Record<string, string> = {
  reading:       "📖 Reading Forest",
  math:          "🏝️ Math Island",
  science:       "🔬 Science Lab",
  social_studies:"🌍 Culture Corner",
  sel:           "🌸 Feeling Field",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Report card ──────────────────────────────────────────────────────────────

function ReportCard({ report }: { report: StoredReport }) {
  const [expanded, setExpanded] = useState(false);

  const zoneLabels = report.zones_visited
    .map((id) => ZONE_NAMES[id] ?? id)
    .join("  ·  ");

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Session report for ${report.child_name}. Tap to ${expanded ? "collapse" : "expand"}.`}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardMeta}>
          <Text style={styles.cardChild}>{report.child_name}</Text>
          <Text style={styles.cardDate}>{formatDate(report.created_at)}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
      </View>

      {/* Zones visited */}
      {zoneLabels ? (
        <Text style={styles.zones}>{zoneLabels}</Text>
      ) : null}

      {/* Summary — always visible */}
      <Text style={styles.summary}>{report.summary}</Text>

      {/* Expanded content */}
      {expanded && (
        <>
          {/* Strengths */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ What went well</Text>
            {report.strengths_this_session.map((s, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}
          </View>

          {/* Areas to watch */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👀 Keep an eye on</Text>
            {report.areas_to_watch.map((a, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{a}</Text>
              </View>
            ))}
          </View>

          {/* One thing to do at home */}
          <View style={[styles.section, styles.homeActivity]}>
            <Text style={styles.sectionTitle}>🏠 Try this at home</Text>
            <Text style={styles.homeText}>{report.one_thing_to_do_at_home}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

// ─── Dashboard screen ─────────────────────────────────────────────────────────

// ── Navigation links to memory + journey ──────────────────────────────────────

function DashboardNav() {
  const router = useRouter();
  return (
    <View style={styles.navRow}>
      <Pressable
        onPress={() => router.push("/(parent)/memory")}
        style={styles.navButton}
      >
        <Text style={styles.navEmoji}>🧠</Text>
        <Text style={styles.navLabel}>What Zoey Knows</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push("/(parent)/journey")}
        style={styles.navButton}
      >
        <Text style={styles.navEmoji}>📈</Text>
        <Text style={styles.navLabel}>Learning Journey</Text>
      </Pressable>
    </View>
  );
}

export default function ParentDashboard() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const data = await fetchReports(user.uid);
      setReports(data);
      setError(null);
    } catch {
      setError("Couldn't load reports. Pull down to try again.");
    }
  }, [user?.uid]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Parent Dashboard" }} />

      <DashboardNav />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.sky} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No reports yet</Text>
          <Text style={styles.emptyBody}>
            Reports appear here after your child completes a session with Zoey.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.sky}
            />
          }
        >
          <Text style={styles.listHeader}>
            {reports.length} session{reports.length !== 1 ? "s" : ""} · tap any card to expand
          </Text>
          {reports.map((r) => (
            <ReportCard key={r.session_id} report={r} />
          ))}
        </ScrollView>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },

  // Empty / error states
  errorText: {
    ...typography.parentBody,
    color: colors.error,
    textAlign: "center",
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    ...typography.parentHeading,
    color: colors.softBlack,
  },
  emptyBody: {
    ...typography.parentBody,
    color: colors.midGray,
    textAlign: "center",
    lineHeight: 24,
  },

  // List
  list: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  listHeader: {
    ...typography.parentCaption,
    color: colors.midGray,
    textAlign: "center",
    marginBottom: spacing.xs,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardMeta: {
    gap: 2,
    flex: 1,
  },
  cardChild: {
    ...typography.parentHeading,
    color: colors.softBlack,
  },
  cardDate: {
    ...typography.parentCaption,
    color: colors.midGray,
  },
  chevron: {
    fontSize: 14,
    color: colors.midGray,
    paddingTop: 4,
  },
  zones: {
    ...typography.parentCaption,
    color: colors.sky,
    fontWeight: "600",
  },
  summary: {
    ...typography.parentBody,
    color: colors.charcoal,
    lineHeight: 24,
  },

  // Expanded sections
  section: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  sectionTitle: {
    ...typography.parentBody,
    fontWeight: "700",
    color: colors.softBlack,
    marginBottom: 2,
  },
  bullet: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  bulletDot: {
    ...typography.parentBody,
    color: colors.midGray,
    lineHeight: 24,
  },
  bulletText: {
    ...typography.parentBody,
    color: colors.charcoal,
    flex: 1,
    lineHeight: 24,
  },
  homeActivity: {
    backgroundColor: "#F0FAF0",
    borderRadius: radius.md,
    padding: spacing.md,
    borderTopWidth: 0,
    marginTop: spacing.xs,
  },
  homeText: {
    ...typography.parentBody,
    color: colors.charcoal,
    lineHeight: 24,
  },

  // Nav row
  navRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  navEmoji: {
    fontSize: 20,
  },
  navLabel: {
    ...typography.parentBody,
    fontWeight: "600",
    color: colors.softBlack,
    fontSize: 14,
  },
});
