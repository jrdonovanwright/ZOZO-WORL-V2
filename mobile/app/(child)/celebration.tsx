/**
 * Celebration screen — minimal stable version.
 * Shows badge only. Features will be added back once navigation is stable.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CelebrationScreen() {
  const router = useRouter();
  const { badge, skill } = useLocalSearchParams<{ badge: string; skill: string }>();

  console.log("[CelebrationScreen] Mounted with badge:", badge, "skill:", skill);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.badge}>{badge ?? "🌟"}</Text>
        <Text style={styles.title}>Amazing work!</Text>
        <Text style={styles.body}>{skill ?? "You did it!"}</Text>
        <Pressable onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>← Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF8E7" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  badge: { fontSize: 80 },
  title: { fontSize: 32, fontWeight: "800", color: "#1A1A1A" },
  body: { fontSize: 18, color: "#5C5C5C", textAlign: "center" },
  button: { backgroundColor: "#FFD93D", borderRadius: 24, paddingHorizontal: 32, paddingVertical: 16, marginTop: 16 },
  buttonText: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
});
