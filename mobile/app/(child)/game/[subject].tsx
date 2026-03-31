import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiClient } from "@/services/api/client";

// ── Reading Forest screen ───────────────────────────────────────────────────

const READING_SKILLS = [
  { id: "sight-words", name: "Sight Words", emoji: "👀", description: "Learn words you see everywhere" },
  { id: "phonics", name: "Phonics", emoji: "🔤", description: "The sounds letters make" },
  { id: "comprehension", name: "Comprehension", emoji: "📖", description: "Understand what you read" },
];

function ReadingForest() {
  const router = useRouter();
  const [greeting, setGreeting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get("/api/v1/world/greeting", {
          params: { zone: "reading" },
          timeout: 5000,
        });
        if (!cancelled) setGreeting(data?.greeting ?? null);
      } catch {
        // API down or endpoint doesn't exist yet — use fallback
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF8E7" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 48 }}>
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 18, color: "#5C5C5C" }}>← Back to Map</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 36, fontWeight: "800", color: "#1A1A1A" }}>
          🌲 Reading Forest
        </Text>

        {/* Zoey greeting */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#6EC6F5" />
          ) : (
            <Text style={{ fontSize: 18, color: "#2D2D2D", lineHeight: 26 }}>
              {greeting ?? "Welcome to Reading Forest! Let's explore letters and stories together! 📖"}
            </Text>
          )}
        </View>

        {/* Skill cards */}
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#1A1A1A", marginTop: 8 }}>
          Choose a skill:
        </Text>

        {READING_SKILLS.map((skill) => (
          <TouchableOpacity
            key={skill.id}
            onPress={() => {
              console.log("[ReadingForest] Skill tapped:", skill.id);
              // TODO: navigate to actual skill activity when built
            }}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 20,
              borderLeftWidth: 5,
              borderLeftColor: "#6EC6F5",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <Text style={{ fontSize: 32 }}>{skill.emoji}</Text>
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#1A1A1A" }}>
                {skill.name}
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: "#5C5C5C", marginBottom: 12 }}>
              {skill.description}
            </Text>
            <View
              style={{
                backgroundColor: "#6EC6F5",
                borderRadius: 16,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>
                Start →
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Placeholder for all other subjects ──────────────────────────────────────

function ComingSoon({ subject }: { subject: string }) {
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF8E7" }}>
      <Text style={{ fontSize: 32, fontWeight: "bold", marginBottom: 20 }}>
        {subject} Zone
      </Text>
      <Text style={{ fontSize: 18, color: "#666", marginBottom: 40 }}>
        Coming soon!
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ backgroundColor: "#E6B800", padding: 16, borderRadius: 24 }}
      >
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Route entry point ───────────────────────────────────────────────────────

export default function GameScreen() {
  const { subject } = useLocalSearchParams();
  const subjectStr = String(subject ?? "unknown");
  console.log("[GameScreen] subject:", subjectStr);

  if (subjectStr === "reading") {
    return <ReadingForest />;
  }

  return <ComingSoon subject={subjectStr} />;
}
