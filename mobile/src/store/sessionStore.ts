/**
 * Session store — accumulates data about the current child learning session.
 *
 * Mounted for the duration of a child session (child layout). The tracker
 * hook reads this store at session end to build the parent report payload.
 *
 * Mood is inferred at read time from accuracy + session length — not stored
 * explicitly so it reflects the full session rather than a point in time.
 */
import { create } from "zustand";
import type { SubjectId } from "../../../shared/types";
import type { MistakeRecord, SessionLog } from "@/services/api/reports";

interface SessionStore {
  sessionId: string;
  startedAt: number;            // Date.now() when session started

  zonesVisited: SubjectId[];
  skillsAttempted: string[];    // skill node IDs e.g. "reading.level_1"
  mistakesLog: MistakeRecord[];

  totalAnswers: number;
  correctAnswers: number;
  readingAnswers: number;
  readingCorrect: number;

  // ── Actions ──────────────────────────────────────────────────────────────
  startSession: () => void;

  recordZoneVisit: (subjectId: SubjectId, skillNodeId: string) => void;

  recordAnswer: (opts: {
    subjectId: SubjectId;
    questionText: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }) => void;

  reset: () => void;

  // ── Derived ──────────────────────────────────────────────────────────────
  buildSessionLog: () => SessionLog;
}

function inferMood(
  totalAnswers: number,
  correctAnswers: number,
  startedAt: number,
): SessionLog["mood"] {
  const accuracyRate = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;
  const elapsedMs = Date.now() - startedAt;

  if (totalAnswers < 3 && elapsedMs < 3 * 60 * 1000) return "tired";
  if (accuracyRate < 0.4) return "struggling";
  if (accuracyRate >= 0.7) return "engaged";
  return "curious";
}

const initialState = {
  sessionId: "",
  startedAt: 0,
  zonesVisited: [] as SubjectId[],
  skillsAttempted: [] as string[],
  mistakesLog: [] as MistakeRecord[],
  totalAnswers: 0,
  correctAnswers: 0,
  readingAnswers: 0,
  readingCorrect: 0,
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  startSession: () =>
    set({
      ...initialState,
      sessionId: `session_${Date.now()}`,
      startedAt: Date.now(),
    }),

  recordZoneVisit: (subjectId, skillNodeId) =>
    set((s) => ({
      zonesVisited: s.zonesVisited.includes(subjectId)
        ? s.zonesVisited
        : [...s.zonesVisited, subjectId],
      skillsAttempted: s.skillsAttempted.includes(skillNodeId)
        ? s.skillsAttempted
        : [...s.skillsAttempted, skillNodeId],
    })),

  recordAnswer: ({ subjectId, questionText, selectedAnswer, correctAnswer, isCorrect }) =>
    set((s) => ({
      totalAnswers: s.totalAnswers + 1,
      correctAnswers: s.correctAnswers + (isCorrect ? 1 : 0),
      readingAnswers: s.readingAnswers + (subjectId === "reading" ? 1 : 0),
      readingCorrect:
        s.readingCorrect + (subjectId === "reading" && isCorrect ? 1 : 0),
      mistakesLog: isCorrect
        ? s.mistakesLog
        : [
            ...s.mistakesLog,
            { question_text: questionText, selected_answer: selectedAnswer, correct_answer: correctAnswer, subject: subjectId },
          ],
    })),

  reset: () => set(initialState),

  buildSessionLog: (): SessionLog => {
    const s = get();
    const readingAccuracy =
      s.readingAnswers > 0 ? s.readingCorrect / s.readingAnswers : 0;
    return {
      mood: inferMood(s.totalAnswers, s.correctAnswers, s.startedAt),
      zones_visited: s.zonesVisited,
      skills_attempted: s.skillsAttempted,
      reading_accuracy: readingAccuracy,
      mistakes_log: s.mistakesLog,
    };
  },
}));
