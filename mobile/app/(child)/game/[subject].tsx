import { View, Text, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

export default function GameScreen() {
  const { subject } = useLocalSearchParams()
  const router = useRouter()

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8E7' }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 20 }}>
        {String(subject)} Zone
      </Text>
      <Text style={{ fontSize: 18, color: '#666', marginBottom: 40 }}>
        Coming soon!
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ backgroundColor: '#E6B800', padding: 16, borderRadius: 24 }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  )
}
