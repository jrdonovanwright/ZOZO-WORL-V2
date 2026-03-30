/**
 * ResumePrompt — overlay shown when a previous session is detected.
 *
 * Zoey asks if the child wants to pick up where they left off.
 * Two buttons: "Keep Going" and "Start Fresh."
 * Plays the opening script via TTS.
 */
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Audio } from "expo-av";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ZoeyAvatar } from "@/components/zoey/ZoeyAvatar";
import { colors, radius, spacing, typography, MIN_TAP_TARGET } from "@/theme";
import type { ResumeCase } from "@/hooks/useSessionResume";

interface ResumePromptProps {
  resumeCase: ResumeCase;
  openingScript: string;
  ttsUrl: string | null;
  skillLabel: string | null;
  onKeepGoing: () => void;
  onStartFresh: () => Promise<void>;
}

export function ResumePrompt({
  resumeCase,
  openingScript,
  ttsUrl,
  skillLabel,
  onKeepGoing,
  onStartFresh,
}: ResumePromptProps) {
  const soundRef = useRef<Audio.Sound | null>(null);

  // Play TTS on mount
  useEffect(() => {
    if (!ttsUrl) return;
    let cancelled = false;

    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: ttsUrl },
          { shouldPlay: true },
        );
        if (cancelled) {
          sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.isLoaded && s.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        });
      } catch {
        // TTS failed — prompt still works visually
      }
    })();

    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, [ttsUrl]);

  // Gentle pulse on buttons
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200 }),
        withTiming(1, { duration: 1200 }),
      ),
      -1,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const isLight = resumeCase === "resume-light";

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      style={styles.overlay}
    >
      <View style={styles.card}>
        {/* Zoey */}
        <ZoeyAvatar size={100} mood="happy" talking={!!ttsUrl} />

        {/* Speech */}
        <View style={styles.speechBubble}>
          <Text style={styles.speechText}>{openingScript}</Text>
        </View>

        {/* Skill reference */}
        {skillLabel && (
          <View style={styles.skillTag}>
            <Text style={styles.skillText}>{skillLabel}</Text>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttons}>
          <Animated.View style={pulseStyle}>
            <Pressable
              onPress={onKeepGoing}
              style={[styles.button, styles.buttonPrimary]}
              accessibilityRole="button"
              accessibilityLabel="Keep going where you left off"
            >
              <Text style={styles.buttonPrimaryText}>
                {isLight ? "Finish it!" : "Keep Going!"}
              </Text>
            </Pressable>
          </Animated.View>

          <Pressable
            onPress={onStartFresh}
            style={[styles.button, styles.buttonSecondary]}
            accessibilityRole="button"
            accessibilityLabel="Start a fresh session"
          >
            <Text style={styles.buttonSecondaryText}>Start Fresh</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.cream,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  speechBubble: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: "100%",
  },
  speechText: {
    ...typography.body,
    fontSize: 18,
    color: colors.softBlack,
    textAlign: "center",
    lineHeight: 26,
  },
  skillTag: {
    backgroundColor: colors.sky,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  skillText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "700",
  },
  buttons: {
    width: "100%",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  button: {
    height: MIN_TAP_TARGET,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: colors.sunflower,
  },
  buttonPrimaryText: {
    ...typography.body,
    fontWeight: "800",
    color: colors.softBlack,
  },
  buttonSecondary: {
    backgroundColor: colors.lightGray,
  },
  buttonSecondaryText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.midGray,
  },
});
