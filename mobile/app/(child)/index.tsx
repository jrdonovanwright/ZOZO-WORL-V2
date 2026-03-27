/**
 * Child home screen — the heart of the app.
 *
 * What the child sees:
 *  • Zoey's avatar (greets them by name, invites free talk when tapped)
 *  • Four subject cards — tap any to start a subject conversation
 *  • A tiny parent icon in the top-right (the only adult-facing chrome)
 *
 * Navigation note: subject conversation screens don't exist yet. The card
 * onPress handlers show an alert stub — replace with router.push() once the
 * conversation screen is built.
 */
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useChildStore } from "@/store/childStore";
import { ZoeyAvatar } from "@/components/zoey/ZoeyAvatar";
import { colors, MIN_TAP_TARGET, radius, spacing, typography } from "@/theme";

// Subject card data — pulled from shared constants to stay in sync with backend
import { SUBJECTS } from "../../../shared/constants/subjects";
import type { SubjectId } from "../../../shared/types";

const SUBJECT_ORDER: SubjectId[] = ["reading", "math", "culture", "science"];

export default function ChildHomeScreen() {
  const router = useRouter();
  const activeChild = useChildStore((s) => s.activeChild);

  const childName = activeChild?.name ?? "friend";

  const handleSubjectPress = (subjectId: SubjectId) => {
    // TODO: router.push(`/(child)/conversation?subject=${subjectId}`)
    Alert.alert(
      SUBJECTS[subjectId].label,
      `Starting ${SUBJECTS[subjectId].label} with Zoey! (conversation screen coming soon)`,
    );
  };

  const handleZoeyPress = () => {
    // TODO: router.push("/(child)/conversation?subject=free_talk")
    Alert.alert("Zoey says hi!", "Free talk mode coming soon!");
  };

  const handleParentPress = () => {
    // TODO: router.push("/(parent)/dashboard")
    Alert.alert("Parent dashboard coming soon!");
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Parent access — tucked away, not a focal point */}
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
        {/* Zoey — tappable to start free conversation */}
        <Pressable onPress={handleZoeyPress} accessibilityLabel="Talk to Zoey">
          <ZoeyAvatar size={160} mood="happy" />
        </Pressable>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Hi {childName}!</Text>
          <Text style={styles.questionText}>What do you want to learn today?</Text>
        </View>

        {/* Subject grid */}
        <View style={styles.grid}>
          {SUBJECT_ORDER.map((id) => {
            const subject = SUBJECTS[id];
            const bgColor = colors[subject.colorKey as keyof typeof colors] as string;
            return (
              <Pressable
                key={id}
                onPress={() => handleSubjectPress(id)}
                accessibilityRole="button"
                accessibilityLabel={`${subject.label}: ${subject.description}`}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: bgColor, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.cardEmoji}>{subject.emoji}</Text>
                <Text style={styles.cardLabel}>{subject.label}</Text>
                <Text style={styles.cardDescription}>{subject.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    fontSize: 26,
  },
  scroll: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  greeting: {
    alignItems: "center",
    gap: spacing.xs,
  },
  greetingText: {
    ...typography.displayMedium,
    color: colors.softBlack,
  },
  questionText: {
    ...typography.body,
    color: colors.charcoal,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
    width: "100%",
  },
  card: {
    width: "47%",
    minHeight: 160,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    shadowColor: colors.softBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardEmoji: {
    fontSize: 40,
  },
  cardLabel: {
    ...typography.heading,
    color: colors.softBlack,
    textAlign: "center",
  },
  cardDescription: {
    ...typography.caption,
    color: colors.charcoal,
    textAlign: "center",
  },
});
