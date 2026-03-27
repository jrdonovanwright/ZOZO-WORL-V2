/**
 * ZoeyAvatar — placeholder component.
 *
 * This will be replaced by Zoey's actual illustrated character art once the
 * design assets are ready. For now it renders a pulsing circle so the layout
 * and animation infrastructure are in place.
 *
 * Props:
 *   size    — diameter in pixels (default 180)
 *   mood    — hint for which expression to show (future: swap sprite sheets)
 *   talking — when true, shows a subtle speaking animation
 */
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors, radius } from "@/theme";

export type ZoeyMood = "happy" | "excited" | "thinking" | "proud" | "concerned";

interface ZoeyAvatarProps {
  size?: number;
  mood?: ZoeyMood;
  talking?: boolean;
}

export function ZoeyAvatar({ size = 180, mood = "happy", talking = false }: ZoeyAvatarProps) {
  const scale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.4);

  // Gentle idle pulse
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  // Talking ring radiates outward
  useEffect(() => {
    if (talking) {
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 400 }),
          withTiming(0.2, { duration: 400 }),
        ),
        -1,
        false,
      );
    } else {
      ringOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [talking]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const moodEmoji: Record<ZoeyMood, string> = {
    happy: "😊",
    excited: "🤩",
    thinking: "🤔",
    proud: "😄",
    concerned: "🥺",
  };

  return (
    <View style={[styles.container, { width: size + 32, height: size + 32 }]}>
      {/* Talking ring */}
      <Animated.View
        style={[
          styles.ring,
          ringStyle,
          { width: size + 24, height: size + 24, borderRadius: (size + 24) / 2 },
        ]}
      />
      {/* Avatar body */}
      <Animated.View
        style={[
          avatarStyle,
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {/* TODO: Replace with actual Zoey character art (Image component + sprite) */}
        <Text style={{ fontSize: size * 0.45 }}>{moodEmoji[mood]}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 4,
    borderColor: colors.sunflower,
  },
  avatar: {
    backgroundColor: colors.lavender,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.softBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
});
