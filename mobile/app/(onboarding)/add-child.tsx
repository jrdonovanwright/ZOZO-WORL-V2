/**
 * Add Child — first step after a parent signs up.
 *
 * Intentionally simple: we only need a name and age to get Zoey started.
 * Parents can add more children or edit details from the parent dashboard later.
 *
 * UX notes:
 *  - Age is a set of three large tap tiles, not a text field. The ages are fixed
 *    (4, 5, 6) so there's no point making the parent type a number.
 *  - The CTA updates in real time to show the child's name once typed.
 */
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createChild } from "@/services/api/children";
import { useChildStore } from "@/store/childStore";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { colors, MIN_TAP_TARGET, radius, spacing, typography } from "@/theme";

const VALID_AGES = [4, 5, 6] as const;

export default function AddChildScreen() {
  const addChild = useChildStore((s) => s.addChild);

  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && age !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    try {
      const child = await createChild(trimmedName, age!);
      addChild(child); // store update triggers root layout to route to /(child)/
    } catch (err: any) {
      setError("Couldn't save your child's profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ctaLabel = trimmedName
    ? `Add ${trimmedName} to Zoey's World`
    : "Add to Zoey's World";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>👧🏾</Text>
            <Text style={styles.title}>Who's learning today?</Text>
            <Text style={styles.subtitle}>
              Tell us a little about your child so Zoey can say hello properly.
            </Text>
          </View>

          {/* Name field */}
          <View style={styles.section}>
            <TextInput
              label="Child's first name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              autoCapitalize="words"
              placeholder="e.g. Amara"
              returnKeyType="done"
              maxLength={50}
            />
          </View>

          {/* Age picker */}
          <View style={styles.section}>
            <Text style={styles.ageLabel}>How old are they?</Text>
            <View style={styles.agePicker}>
              {VALID_AGES.map((a) => (
                <Pressable
                  key={a}
                  onPress={() => setAge(a)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: age === a }}
                  accessibilityLabel={`${a} years old`}
                  style={[
                    styles.ageTile,
                    age === a && styles.ageTileSelected,
                  ]}
                >
                  <Text style={[styles.ageNumber, age === a && styles.ageNumberSelected]}>
                    {a}
                  </Text>
                  <Text style={[styles.ageUnit, age === a && styles.ageNumberSelected]}>
                    yrs
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={ctaLabel}
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
            size="large"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 72,
  },
  title: {
    ...typography.heading,
    color: colors.softBlack,
    textAlign: "center",
  },
  subtitle: {
    ...typography.parentBody,
    color: colors.charcoal,
    textAlign: "center",
  },
  section: {
    gap: spacing.sm,
  },
  ageLabel: {
    ...typography.parentBody,
    color: colors.charcoal,
    fontWeight: "600",
  },
  agePicker: {
    flexDirection: "row",
    gap: spacing.md,
  },
  ageTile: {
    flex: 1,
    minHeight: MIN_TAP_TARGET + 16,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.lightGray,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  ageTileSelected: {
    backgroundColor: colors.sunflower,
    borderColor: colors.sunflower,
  },
  ageNumber: {
    ...typography.heading,
    color: colors.charcoal,
  },
  ageUnit: {
    ...typography.caption,
    color: colors.midGray,
  },
  ageNumberSelected: {
    color: colors.softBlack,
  },
  error: {
    ...typography.parentCaption,
    color: colors.error,
    textAlign: "center",
  },
});
