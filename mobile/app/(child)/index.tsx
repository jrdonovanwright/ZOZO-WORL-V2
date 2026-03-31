/**
 * World Map — minimal stable version for navigation debugging.
 * All hooks, animations, API calls, and custom components removed.
 * Just 5 tappable zones that navigate to the game screen.
 */
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const ZONES = [
  { id: "reading", name: "Reading Forest", emoji: "📖", color: "#6EC6F5" },
  { id: "math", name: "Math Island", emoji: "🔢", color: "#FFD93D" },
  { id: "science", name: "Science Lab", emoji: "🔬", color: "#6BCB77" },
  { id: "social_studies", name: "Culture Corner", emoji: "🌍", color: "#FFB347" },
  { id: "sel", name: "Feeling Field", emoji: "🌸", color: "#C9B8FF" },
];

export default function WorldMapScreen() {
  const router = useRouter();
  console.log("[WorldMap] Rendering");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF8E7" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 32, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>
          🗺️ Your World
        </Text>

        {ZONES.map((zone) => (
          <TouchableOpacity
            key={zone.id}
            onPress={() => {
              console.log("[WorldMap] Tapped:", zone.id);
              router.push(`/(child)/game/${zone.id}` as any);
            }}
            style={{
              backgroundColor: zone.color,
              borderRadius: 24,
              padding: 24,
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 40 }}>{zone.emoji}</Text>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#1A1A1A" }}>
              {zone.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
