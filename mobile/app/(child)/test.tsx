import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function TestScreen() {
  const router = useRouter();
  console.log("[TestScreen] Mounted");
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF8E7" }}>
      <Text style={{ fontSize: 32, fontWeight: "bold" }}>It works!</Text>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ backgroundColor: "#E6B800", padding: 16, borderRadius: 24, marginTop: 32 }}
      >
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}
