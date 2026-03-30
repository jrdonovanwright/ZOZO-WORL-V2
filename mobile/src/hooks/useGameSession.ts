/**
 * useGameSession — the adaptive game session state machine.
 *
 * States:
 *   loading   → fetching next question from backend
 *   speaking  → Zoey is reading the question aloud (TTS playing)
 *   answering → question visible, child can tap a choice
 *   correct   → correct answer tapped, playing celebration audio
 *   wrong     → wrong answer tapped, playing encouragement audio
 *   hinting   → Zoey giving a mid-game scaffold hint before the next question
 *   levelup   → difficulty changed, showing announcement
 *   complete  → session finished (SESSION_LENGTH questions answered)
 *   error     → unrecoverable fetch failure
 *
 * Two-layer difficulty system:
 *
 *   Layer 1 — Threshold engine (every 5 Qs, via submitAnswer → Firebase)
 *     Persists level changes to Firebase. Fires at Q5, Q10.
 *     Implemented in backend/app/services/game/difficulty_engine.py.
 *
 *   Layer 2 — AI advisor (every 3 Qs, GPT-4o, session-local only)
 *     Analyzes last 3 responses for nuanced coaching. Fires at Q3, Q6, Q9.
 *     Returns one of three cues:
 *       "scaffold"  → Zoey gives a specific spoken hint before the next question
 *       "challenge" → Level went up; Zoey celebrates with a personalized message
 *       "encourage" → Level stays; no interruption, session continues normally
 *
 *   The two layers fire at different question counts within a 10-question session
 *   (3/6/9 vs 5/10) so they never compete for the same advance() call.
 *   AI level changes update the in-session level immediately; Firebase is updated
 *   by the threshold engine at its own cadence.
 *
 * If the AI advisor hasn't resolved by the time advance() is called, the cue is
 * delivered at the next advance() that finds it — typically within 1-2 questions.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";

import type { SubjectId } from "../../../shared/types";
import {
  adjustDifficulty,
  fetchQuestion,
  submitAnswer,
  type AnswerResponse,
  type DifficultyAdjustResponse,
  type GameQuestion,
  type ResponseRecord,
} from "@/services/api/game";

export type GameStatus =
  | "loading"
  | "speaking"
  | "answering"
  | "correct"
  | "wrong"
  | "hinting"
  | "levelup"
  | "complete"
  | "error";

export const SESSION_LENGTH = 10;
/** Fire the AI difficulty advisor after every N scored answers. */
const AI_EVAL_WINDOW = 3;

interface UseGameSessionOptions {
  childId: string;
  childName: string;
  childAge: number;
  subjectId: SubjectId;
  startLevel?: number;
}

interface UseGameSessionReturn {
  status: GameStatus;
  question: GameQuestion | null;
  selectedId: string | null;
  sessionCount: number;
  sessionCorrect: number;
  currentLevel: number;
  newLevel: number | null;
  levelChangeDirection: "up" | "down" | null;
  /** Text of Zoey's scaffold hint — shown as a bubble during the "hinting" state. */
  zoeyHintMessage: string | null;
  handleAnswer: (choiceId: string) => void;
  retry: () => void;
}

export function useGameSession({
  childId,
  childName,
  childAge,
  subjectId,
  startLevel = 1,
}: UseGameSessionOptions): UseGameSessionReturn {
  const [status, setStatus] = useState<GameStatus>("loading");
  const [question, setQuestion] = useState<GameQuestion | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(startLevel);
  const [newLevel, setNewLevel] = useState<number | null>(null);
  const [levelChangeDirection, setLevelChangeDirection] = useState<"up" | "down" | null>(null);
  const [zoeyHintMessage, setZoeyHintMessage] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const nextQuestionRef = useRef<GameQuestion | null>(null);
  const isMountedRef = useRef(true);

  // ── Cross-closure refs (avoid stale state in async callbacks) ────────────
  /** Always holds the current difficulty level — safe to read inside any closure. */
  const currentLevelRef = useRef(startLevel);
  /** Set by submitAnswer's threshold engine when a level change occurs (Q5, Q10). */
  const pendingLevelRef = useRef<{ newLevel: number; direction: "up" | "down" } | null>(null);
  /** Set by the AI advisor when a coaching cue arrives (Q3, Q6, Q9). */
  const pendingCueRef = useRef<DifficultyAdjustResponse | null>(null);
  /** Prevents double-firing the AI advisor at the same checkpoint. */
  const cueInFlightRef = useRef(false);
  /** Accumulates per-answer records for the AI advisor's 3-answer window. */
  const responseHistoryRef = useRef<ResponseRecord[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // ── Audio helpers ─────────────────────────────────────────────────────────

  const stopAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  };

  const playUrl = (url: string, onFinish: () => void): void => {
    stopAudio().then(async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.isLoaded && s.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            soundRef.current = null;
            if (isMountedRef.current) onFinish();
          }
        });
      } catch {
        if (isMountedRef.current) onFinish();
      }
    });
  };

  // ── Question loading ──────────────────────────────────────────────────────

  const loadQuestion = useCallback((q: GameQuestion) => {
    if (!isMountedRef.current) return;
    setQuestion(q);
    setSelectedId(null);
    setNewLevel(null);
    setLevelChangeDirection(null);
    setZoeyHintMessage(null);

    if (q.tts_prompt_url) {
      setStatus("speaking");
      playUrl(q.tts_prompt_url, () => {
        if (isMountedRef.current) setStatus("answering");
      });
    } else {
      setStatus("answering");
    }
  }, []);

  const fetchAndLoad = useCallback(async () => {
    if (!isMountedRef.current) return;
    setStatus("loading");
    try {
      const q = await fetchQuestion({
        child_id: childId,
        subject_id: subjectId,
        child_name: childName,
        child_age: childAge,
        level: currentLevelRef.current,
      });
      if (isMountedRef.current) loadQuestion(q);
    } catch {
      if (isMountedRef.current) setStatus("error");
    }
  }, [childId, subjectId, childName, childAge, loadQuestion]);

  const prefetchNext = useCallback(() => {
    fetchQuestion({
      child_id: childId,
      subject_id: subjectId,
      child_name: childName,
      child_age: childAge,
      level: currentLevelRef.current,
    })
      .then((q) => { nextQuestionRef.current = q; })
      .catch(() => { nextQuestionRef.current = null; });
  }, [childId, subjectId, childName, childAge]);

  useEffect(() => {
    fetchAndLoad();
  }, []); // intentionally only on mount

  // ── AI difficulty advisor — fires every AI_EVAL_WINDOW scored answers ─────

  const fireAIEvaluation = useCallback((window: ResponseRecord[]) => {
    if (cueInFlightRef.current) return;
    cueInFlightRef.current = true;

    adjustDifficulty({
      child_id: childId,
      child_name: childName,
      child_age: childAge,
      subject_id: subjectId,
      skill_id: subjectId,
      recent_responses: window,
      current_difficulty: currentLevelRef.current,
    })
      .then((result) => {
        if (!isMountedRef.current) return;
        pendingCueRef.current = result;
      })
      .catch(() => {/* non-blocking — session continues without coaching cue */})
      .finally(() => { cueInFlightRef.current = false; });
  }, [childId, childName, childAge, subjectId]);

  // ── Answer handling ───────────────────────────────────────────────────────

  const handleAnswer = useCallback(
    (choiceId: string) => {
      if (status !== "answering" || !question) return;

      stopAudio();
      setSelectedId(choiceId);

      const isCorrect = choiceId === question.correct_id;
      const nextCount = sessionCount + 1;
      const nextCorrect = isCorrect ? sessionCorrect + 1 : sessionCorrect;

      setSessionCount(nextCount);
      if (isCorrect) setSessionCorrect(nextCorrect);
      setStatus(isCorrect ? "correct" : "wrong");

      // ── Track response for the AI advisor ──────────────────────────────
      if (question.scored) {
        const selectedChoice = question.choices.find((c) => c.id === choiceId);
        const correctChoice  = question.choices.find((c) => c.id === question.correct_id);
        responseHistoryRef.current.push({
          question_text: question.prompt,
          selected_text: selectedChoice?.text ?? choiceId,
          correct_text:  correctChoice?.text  ?? question.correct_id,
          is_correct: isCorrect,
        });

        // Fire the AI advisor every AI_EVAL_WINDOW scored answers
        const scoredCount = responseHistoryRef.current.length;
        if (scoredCount % AI_EVAL_WINDOW === 0) {
          fireAIEvaluation(responseHistoryRef.current.slice(-AI_EVAL_WINDOW));
        }
      }

      // ── Submit to Firebase (fire and forget) ───────────────────────────
      // Threshold engine may return a level change (new_level) at Q5, Q10.
      submitAnswer({
        child_id: childId,
        subject_id: subjectId,
        question_id: question.id,
        selected_id: choiceId,
        correct_id: question.correct_id,
        scored: question.scored,
        level: currentLevelRef.current,
        session_question_count: nextCount,
        session_correct_count: nextCorrect,
      })
        .then((result: AnswerResponse) => {
          if (!isMountedRef.current) return;
          if (result.new_level && result.new_level !== currentLevelRef.current) {
            const direction = result.new_level > currentLevelRef.current ? "up" : "down";
            pendingLevelRef.current = { newLevel: result.new_level, direction };
            currentLevelRef.current = result.new_level;
            nextQuestionRef.current = null;
            setCurrentLevel(result.new_level);
            setNewLevel(result.new_level);
            setLevelChangeDirection(direction);
          }
        })
        .catch(() => {});

      // Prefetch next question while feedback plays
      prefetchNext();

      // ── advance() — called when feedback audio ends ────────────────────
      // Reads from refs (never stale) to decide what happens next:
      //   1. AI cue (scaffold/challenge) → interrupt with hint or levelup
      //   2. Threshold level change      → show levelup banner
      //   3. Default                     → load next question
      const advance = () => {
        if (!isMountedRef.current) return;
        if (nextCount >= SESSION_LENGTH) {
          setStatus("complete");
          return;
        }

        const aiCue = pendingCueRef.current;
        if (aiCue) {
          pendingCueRef.current = null;

          // Apply AI-advised level change
          if (aiCue.new_difficulty !== currentLevelRef.current) {
            const dir = aiCue.new_difficulty > currentLevelRef.current ? "up" : "down";
            currentLevelRef.current = aiCue.new_difficulty;
            nextQuestionRef.current = null;
            setCurrentLevel(aiCue.new_difficulty);
            setNewLevel(aiCue.new_difficulty);
            setLevelChangeDirection(dir);
          }

          if (aiCue.zoey_cue === "scaffold") {
            // Zoey speaks a specific hint before the next question
            setZoeyHintMessage(aiCue.zoey_message);
            setStatus("hinting");
            const onDone = () => {
              if (!isMountedRef.current) return;
              setZoeyHintMessage(null);
              advanceToNext();
            };
            if (aiCue.tts_url) {
              playUrl(aiCue.tts_url, onDone);
            } else {
              setTimeout(onDone, 3000);
            }
            return;
          }

          if (aiCue.zoey_cue === "challenge") {
            // Level went up — show celebration, play personalized TTS, then next Q
            setStatus("levelup");
            if (aiCue.tts_url) playUrl(aiCue.tts_url, () => {});
            setTimeout(() => {
              if (isMountedRef.current) advanceToNext();
            }, 2500);
            return;
          }

          // "encourage" — no interruption, just advance
          advanceToNext();
          return;
        }

        // Threshold engine level change (from submitAnswer at Q5, Q10)
        const pending = pendingLevelRef.current;
        if (pending !== null) {
          pendingLevelRef.current = null;
          setStatus("levelup");
          setTimeout(() => {
            if (isMountedRef.current) advanceToNext();
          }, 2500);
          return;
        }

        advanceToNext();
      };

      const feedbackUrl = isCorrect ? question.tts_correct_url : question.tts_wrong_url;
      if (feedbackUrl) {
        playUrl(feedbackUrl, advance);
      } else {
        setTimeout(advance, 1800);
      }
    },
    [
      status, question, sessionCount, sessionCorrect,
      childId, subjectId, prefetchNext, fireAIEvaluation,
    ],
  );

  const advanceToNext = useCallback(() => {
    if (nextQuestionRef.current) {
      const q = nextQuestionRef.current;
      nextQuestionRef.current = null;
      loadQuestion(q);
    } else {
      fetchAndLoad();
    }
  }, [loadQuestion, fetchAndLoad]);

  const retry = useCallback(() => {
    fetchAndLoad();
  }, [fetchAndLoad]);

  return {
    status,
    question,
    selectedId,
    sessionCount,
    sessionCorrect,
    currentLevel,
    newLevel,
    levelChangeDirection,
    zoeyHintMessage,
    handleAnswer,
    retry,
  };
}
