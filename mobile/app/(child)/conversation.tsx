/**
 * Conversation screen — where the child talks with Zoey.
 *
 * Flow:
 *   1. Screen opens with subject context (passed via query param)
 *   2. Zoey's avatar is centered; a speech bubble shows her last reply
 *   3. Child holds the mic button to record, releases to send
 *   4. State machine (idle → listening → thinking → speaking → idle) drives UI
 *   5. Back button is the only way to exit — no accidental swipe-backs
 *
 * The first Zoey message is a static opener rendered immediately so the child
 * doesn't stare at a blank screen waiting for the API. The opener comes from
 * the subject constants so it stays consistent with the prompt engineering.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useChildStore } from "@/store/childStore";
import { ZoeyAvatar } from "@/components/zoey/ZoeyAvatar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useConversation } from "@/hooks/useConversation";
import { colors, MIN_TAP_TARGET, radius, spacing, typography } from "@/theme";

import { SUBJECTS } from "../../../shared/constants/subjects";
import type { SubjectId } from "../../../shared/types";

// Static openers so the child sees Zoey say something the instant the screen loads.
// These are warm, curiosity-sparking — no quiz pressure, no "let's begin a lesson".
const SUBJECT_OPENERS: Record<string, string> = {
  reading: "Ooh, I love stories! Do you have a favorite book? Tell me about it!",
  math: "Math is like a puzzle game! What numbers are you thinking about today?",
  social_studies: "I know SO many cool stories about amazing people who look like us! Want to hear one?",
  science: "The world is so interesting! I was wondering why the sky is blue — do you know?",
  sel: "Feelings are so important! How are you feeling right now? I want to know!",
  arts: "I love making things! Do you like drawing or painting?",
  health: "Let's learn about taking care of our amazing bodies! Ready?",
};

const DEFAULT_OPENER = "Hi! I'm so happy you're here. What do you want to talk about?";

// Maps conversation status to the mood Zoey's avatar should display
function statusToMood(status: string): "happy" | "excited" | "thinking" | "proud" | "concerned" {
  switch (status) {
    case "thinking": return "thinking";
    case "speaking": return "excited";
    case "error": return "concerned";
    default: return "happy";
  }
}

export default function ConversationScreenWrapper() {
  console.log("[ConversationScreen] Wrapper rendering");
  return (
    <ErrorBoundary>
      <ConversationScreen />
    </ErrorBoundary>
  );
}

function ConversationScreen() {
  console.log("[ConversationScreen] Component rendering");
  const router = useRouter();
  const params = useLocalSearchParams<{ subject: string }>();
  const subjectId = (params.subject ?? "free_talk") as SubjectId;

  const activeChild = useChildStore((s) => s.activeChild);
  const childName = activeChild?.name ?? "friend";
  const childAge = activeChild?.age ?? 5;
  const childId = activeChild?.id ?? "unknown";

  // Stable session ID for this screen visit
  const sessionId = useRef(
    `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  ).current;

  const subject = SUBJECTS[subjectId];

  const { status, currentZoeyText, sendAudio, setListening, clearError } =
    useConversation({
      childId,
      sessionId,
      subjectId,
      childName,
      childAge,
    });

  const { isRecording, hasPermission, start, stop } = useAudioRecorder();

  // The displayed Zoey message — starts as the static opener
  const [displayText, setDisplayText] = useState(SUBJECT_OPENERS[subjectId] ?? DEFAULT_OPENER);

  // Update display text whenever Zoey responds
  useEffect(() => {
    if (currentZoeyText) setDisplayText(currentZoeyText);
  }, [currentZoeyText]);

  // --- Mic button press-and-hold logic ---

  const handleMicPressIn = async () => {
    if (status !== "idle" && status !== "error") return;
    clearError();
    await start();
    setListening(true);
  };

  const handleMicPressOut = async () => {
    if (!isRecording) return;
    setListening(false);
    const result = await stop();
    if (result) {
      await sendAudio(result.base64, result.mimeType);
    }
  };

  // --- Mic button pulse animation (while recording) ---

  const micScale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      micScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      micScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const micAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  // --- Status label shown above mic ---

  function statusLabel(): string {
    if (hasPermission === false) return "Microphone access needed";
    switch (status) {
      case "listening": return "I'm listening...";
      case "thinking": return "Zoey is thinking...";
      case "speaking": return "Zoey is talking!";
      case "error": return "Oops! Tap to try again.";
      default: return "Hold the mic to talk";
    }
  }

  const micDisabled = status === "thinking" || status === "speaking" || hasPermission === false;

  const bgColor = (colors[subject.colorKey as keyof typeof colors] as string) ?? colors.lavender;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header — subject label + back button */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <View style={[styles.subjectBadge, { backgroundColor: bgColor }]}>
          <Text style={styles.subjectEmoji}>{subject.emoji}</Text>
          <Text style={styles.subjectLabel}>{subject.label}</Text>
        </View>

        {/* Spacer to keep badge centered */}
        <View style={styles.backButton} />
      </View>

      {/* Main content */}
      <View style={styles.body}>
        {/* Zoey avatar */}
        <ZoeyAvatar
          size={160}
          mood={statusToMood(status)}
          talking={status === "speaking"}
        />

        {/* Speech bubble */}
        <View style={styles.bubble}>
          <ScrollView
            style={styles.bubbleScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bubbleContent}
          >
            <Text style={styles.bubbleText}>{displayText}</Text>
          </ScrollView>
          {/* Bubble tail */}
          <View style={styles.bubbleTail} />
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.controls}>
        <Text style={styles.statusLabel}>{statusLabel()}</Text>

        <Animated.View style={micAnimStyle}>
          <Pressable
            onPressIn={handleMicPressIn}
            onPressOut={handleMicPressOut}
            disabled={micDisabled}
            accessibilityLabel={isRecording ? "Recording — release to send" : "Hold to talk to Zoey"}
            accessibilityRole="button"
            style={[
              styles.micButton,
              isRecording && styles.micButtonRecording,
              micDisabled && styles.micButtonDisabled,
            ]}
          >
            <Text style={styles.micIcon}>{isRecording ? "🔴" : "🎤"}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 28,
    color: colors.charcoal,
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  subjectEmoji: {
    fontSize: 20,
  },
  subjectLabel: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.softBlack,
  },

  // Body
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },

  // Speech bubble
  bubble: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: "100%",
    maxHeight: 200,
    shadowColor: colors.softBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleScroll: {
    flexGrow: 0,
  },
  bubbleContent: {
    flexGrow: 1,
  },
  bubbleText: {
    ...typography.body,
    color: colors.softBlack,
    textAlign: "center",
  },
  bubbleTail: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    width: 20,
    height: 20,
    backgroundColor: colors.white,
    transform: [{ rotate: "45deg" }],
    shadowColor: colors.softBlack,
    shadowOffset: { width: -1, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },

  // Controls
  controls: {
    alignItems: "center",
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  statusLabel: {
    ...typography.caption,
    color: colors.charcoal,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.sunflower,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.softBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  micButtonRecording: {
    backgroundColor: colors.coral,
  },
  micButtonDisabled: {
    backgroundColor: colors.midGray,
    shadowOpacity: 0,
    elevation: 0,
  },
  micIcon: {
    fontSize: 38,
  },
});
