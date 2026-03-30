/**
 * useLesson — fetches and plays a Zoey micro-lesson.
 *
 * States:
 *   loading  → calling /api/v1/lesson/generate + synthesizing TTS (3–8 s)
 *   playing  → TTS audio playing, progress bar advancing
 *   complete → audio finished; shows "Let's go!" CTA
 *   error    → API or TTS failure (lesson can be skipped)
 *
 * The progress bar is time-driven: when audio starts, a shared value
 * animates from 0 → 1 over estimated_duration_seconds.
 *
 * Zoey's mood shifts automatically through three phases:
 *   0–33 %  → "happy"   (warm opening)
 *   33–66 % → "excited" (main concept)
 *   66–100% → "proud"   (bridge to activity)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import { useSharedValue, withTiming, Easing } from "react-native-reanimated";

import type { SubjectId } from "../../../shared/types";
import type { ZoeyMood } from "@/components/zoey/ZoeyAvatar";
import {
  generateLesson,
  skillId,
  gradeLevel,
  type FollowUpActivityType,
  type GenerateLessonResponse,
} from "@/services/api/lesson";

export type LessonStatus = "loading" | "playing" | "complete" | "error";

interface UseLessonOptions {
  subjectId: SubjectId;
  level: number;
  childName: string;
  childAge: number;
  priorMisconceptions?: string[];
}

interface UseLessonReturn {
  status: LessonStatus;
  lesson: GenerateLessonResponse | null;
  zoeyMood: ZoeyMood;
  /** 0 → 1 shared value, drives the animated progress bar. */
  progressValue: ReturnType<typeof useSharedValue>;
  replay: () => void;
  skip: () => void;       // marks complete without finishing audio
}

function moodFromProgress(p: number): ZoeyMood {
  if (p < 0.33) return "happy";
  if (p < 0.66) return "excited";
  return "proud";
}

export function useLesson({
  subjectId,
  level,
  childName,
  childAge,
  priorMisconceptions = [],
}: UseLessonOptions): UseLessonReturn {
  const [status, setStatus] = useState<LessonStatus>("loading");
  const [lesson, setLesson] = useState<GenerateLessonResponse | null>(null);
  const [zoeyMood, setZoeyMood] = useState<ZoeyMood>("happy");

  const progressValue = useSharedValue(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isMountedRef = useRef(true);
  // js-side progress mirror so we can derive mood without subscribing to the shared value
  const progressMirrorRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const startAudio = useCallback(async (url: string, durationSeconds: number) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
      );
      soundRef.current = sound;

      // Animate progress bar over the estimated duration
      progressValue.value = 0;
      progressValue.value = withTiming(1, {
        duration: durationSeconds * 1000,
        easing: Easing.linear,
      });

      // Poll mood from progress every 500 ms (avoids subscribing to shared value on JS thread)
      const moodInterval = setInterval(() => {
        progressMirrorRef.current = Math.min(
          progressMirrorRef.current + 500 / (durationSeconds * 1000),
          1,
        );
        if (isMountedRef.current) {
          setZoeyMood(moodFromProgress(progressMirrorRef.current));
        }
      }, 500);

      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded && s.didJustFinish) {
          clearInterval(moodInterval);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
          progressValue.value = 1;
          if (isMountedRef.current) {
            setZoeyMood("proud");
            setStatus("complete");
          }
        }
      });
    } catch {
      // TTS unavailable — show text-only lesson and auto-complete after display time
      if (isMountedRef.current) {
        progressValue.value = withTiming(1, {
          duration: durationSeconds * 1000,
          easing: Easing.linear,
        });
        setTimeout(() => {
          if (isMountedRef.current) setStatus("complete");
        }, durationSeconds * 1000);
      }
    }
  }, [progressValue]);

  useEffect(() => {
    let cancelled = false;

    generateLesson({
      skill_id: skillId(subjectId, level),
      grade_level: gradeLevel(childAge),
      child_name: childName,
      child_age: childAge,
      prior_misconceptions: priorMisconceptions,
    })
      .then((result) => {
        if (cancelled || !isMountedRef.current) return;
        setLesson(result);
        setStatus("playing");

        if (result.tts_url) {
          startAudio(result.tts_url, result.estimated_duration_seconds);
        } else {
          // No TTS — advance via timer so the child can still read the script
          progressValue.value = withTiming(1, {
            duration: result.estimated_duration_seconds * 1000,
            easing: Easing.linear,
          });
          setTimeout(() => {
            if (isMountedRef.current) setStatus("complete");
          }, result.estimated_duration_seconds * 1000);
        }
      })
      .catch(() => {
        if (!cancelled && isMountedRef.current) setStatus("error");
      });

    return () => { cancelled = true; };
  }, [subjectId, level, childName, childAge]); // eslint-disable-line react-hooks/exhaustive-deps

  const replay = useCallback(() => {
    if (!lesson?.tts_url || status === "loading") return;
    progressMirrorRef.current = 0;
    setZoeyMood("happy");
    setStatus("playing");
    startAudio(lesson.tts_url, lesson.estimated_duration_seconds);
  }, [lesson, status, startAudio]);

  const skip = useCallback(() => {
    soundRef.current?.stopAsync().catch(() => {});
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    progressValue.value = 1;
    setStatus("complete");
  }, [progressValue]);

  return { status, lesson, zoeyMood, progressValue, replay, skip };
}
