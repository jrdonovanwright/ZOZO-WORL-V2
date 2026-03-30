/**
 * "What Zoey Knows" — parent view of the child's personal memory.
 *
 * Displays the memory object as a friendly profile card. Parents can
 * tap the X next to any entry to delete it.
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
  clearAllMemory,
  deleteMemoryEntry,
  fetchMemory,
  type ZoeyMemory,
} from "@/services/api/memory";
import { colors, radius, spacing, typography } from "@/theme";

// ── Memory entry row ────────────────────────────────────────────────────────

function EntryRow({
  label,
  value,
  onDelete,
}: {
  label: string;
  value: string;
  onDelete?: () => void;
}) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryContent}>
        <Text style={styles.entryLabel}>{label}</Text>
        <Text style={styles.entryValue}>{value}</Text>
      </View>
      {onDelete && (
        <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteBtn}>
          <Text style={styles.deleteIcon}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Array section ───────────────────────────────────────────────────────────

function ArraySection({
  title,
  items,
  field,
  render,
  onDelete,
}: {
  title: string;
  items: any[];
  field: string;
  render: (item: any) => string;
  onDelete: (field: string, index: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, i) => (
        <EntryRow
          key={`${field}-${i}`}
          label=""
          value={render(item)}
          onDelete={() => onDelete(field, i)}
        />
      ))}
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function MemoryScreen() {
  const activeChild = useChildStore((s) => s.activeChild);
  const childId = activeChild?.id ?? "dev-child";

  const [memory, setMemory] = useState<ZoeyMemory | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchMemory(childId);
      setMemory(data);
    } catch {
      // silent
    }
    setLoading(false);
  }, [childId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(
    async (field: string, index?: number) => {
      try {
        const updated = await deleteMemoryEntry(childId, field, index);
        setMemory(updated);
      } catch {
        // silent
      }
    },
    [childId],
  );

  const handleClearAll = useCallback(() => {
    Alert.alert(
      "Clear All Memory?",
      "This will erase everything Zoey knows about your child. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            await clearAllMemory(childId).catch(() => {});
            await load();
          },
        },
      ],
    );
  }, [childId, load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "What Zoey Knows" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.sky} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "What Zoey Knows" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>
          These are things Zoey has learned about {activeChild?.name ?? "your child"} through
          conversation. You can remove anything here.
        </Text>

        {memory && (
          <>
            {/* Scalar fields */}
            {memory.favorite_animal && (
              <EntryRow
                label="Favorite animal"
                value={memory.favorite_animal}
                onDelete={() => handleDelete("favorite_animal")}
              />
            )}
            {memory.favorite_color && (
              <EntryRow
                label="Favorite color"
                value={memory.favorite_color}
                onDelete={() => handleDelete("favorite_color")}
              />
            )}
            {memory.current_goal && (
              <EntryRow
                label="Current goal"
                value={memory.current_goal}
                onDelete={() => handleDelete("current_goal")}
              />
            )}

            {/* Array fields */}
            <ArraySection
              title="Interests"
              items={memory.interests}
              field="interests"
              render={(item) => item}
              onDelete={handleDelete}
            />
            <ArraySection
              title="Family members mentioned"
              items={memory.family_mentions}
              field="family_mentions"
              render={(f) => `${f.name} (${f.relationship})`}
              onDelete={handleDelete}
            />
            <ArraySection
              title="Funny moments"
              items={memory.funny_moments}
              field="funny_moments"
              render={(m) => `${m.description} — ${m.date}`}
              onDelete={handleDelete}
            />
            <ArraySection
              title="Big wins"
              items={memory.big_wins}
              field="big_wins"
              render={(w) => `${w.description} — ${w.date}`}
              onDelete={handleDelete}
            />
            <ArraySection
              title="Personality notes"
              items={memory.personality_notes}
              field="personality_notes"
              render={(n) => n}
              onDelete={handleDelete}
            />
          </>
        )}

        {/* Clear all */}
        <Pressable onPress={handleClearAll} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Clear All Memory</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxxl },
  header: {
    ...typography.parentBody,
    color: colors.midGray,
    lineHeight: 22,
  },
  section: { gap: spacing.xs },
  sectionTitle: {
    ...typography.parentHeading,
    color: colors.softBlack,
    marginTop: spacing.sm,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  entryContent: { flex: 1 },
  entryLabel: { ...typography.parentCaption, color: colors.midGray },
  entryValue: { ...typography.parentBody, color: colors.softBlack },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.lightGray,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: { fontSize: 12, color: colors.midGray, fontWeight: "700" },
  clearBtn: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: "center",
  },
  clearBtnText: {
    ...typography.parentBody,
    color: colors.error,
    fontWeight: "600",
  },
});
