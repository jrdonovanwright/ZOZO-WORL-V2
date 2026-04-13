/**
 * Lesson screen — minimal stable version.
 * Shows subject + level only. Features will be added back once navigation is stable.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LessonScreen() {
  const router = useRouter();
  const { subject, level } = useLocalSearchParams<{ subject: string; level: string }>();

  console.log("[LessonScreen] Mounted with subject:", subject, "level:", level);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.emoji}>📖</Text>
        <Text style={styles.title}>Lesson: {subject ?? "unknown"}</Text>
        <Text style={styles.body}>Level {level ?? "1"}</Text>
        <Pressable onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>← Back to Map</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF8E7" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  emoji: { fontSize: 64 },
  title: { fontSize: 28, fontWeight: "700", color: "#1A1A1A", textAlign: "center" },
  body: { fontSize: 18, color: "#5C5C5C", textAlign: "center" },
  button: { backgroundColor: "#FFD93D", borderRadius: 24, paddingHorizontal: 32, paddingVertical: 16, marginTop: 16 },
  buttonText: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
});
