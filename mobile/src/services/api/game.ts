import { apiClient } from "./client";
import type { GameQuestion, SubjectId, ChildProgress } from "../../../shared/types";

export type { GameQuestion, ChildProgress };

// ---------------------------------------------------------------------------
// Difficulty advisor types
// ---------------------------------------------------------------------------

export interface ResponseRecord {
  question_text: string;   // what Zoey asked
  selected_text: string;   // answer the child tapped (text, not id)
  correct_text: string;    // the correct answer text
  is_correct: boolean;
}

export interface DifficultyAdjustRequest {
  child_id: string;
  child_name: string;
  child_age: number;
  subject_id: SubjectId;
  skill_id: string;              // = subject_id now; granular skill IDs are future work
  recent_responses: ResponseRecord[];  // exactly 3
  current_difficulty: number;
}

export interface DifficultyAdjustResponse {
  new_difficulty: number;
  zoey_cue: "encourage" | "challenge" | "scaffold";
  zoey_message: string;
  tts_url: string | null;
}

export interface QuestionRequest {
  child_id: string;
  subject_id: SubjectId;
  child_name: string;
  child_age: number;
  level: number;
}

export interface AnswerRequest {
  child_id: string;
  subject_id: SubjectId;
  question_id: string;
  selected_id: string;
  correct_id: string;
  scored: boolean;
  level: number;
  session_question_count: number;
  session_correct_count: number;
}

export interface AnswerResponse {
  is_correct: boolean;
  new_level: number | null;
  accuracy_rate: number;
}

export const fetchQuestion = async (req: QuestionRequest): Promise<GameQuestion> => {
  const { data } = await apiClient.post<GameQuestion>("/api/v1/game/question", req);
  return data;
};

export const submitAnswer = async (req: AnswerRequest): Promise<AnswerResponse> => {
  const { data } = await apiClient.post<AnswerResponse>("/api/v1/game/answer", req);
  return data;
};

export const fetchProgress = async (
  childId: string,
  subjectId: SubjectId,
): Promise<ChildProgress> => {
  const { data } = await apiClient.get<ChildProgress>(
    `/api/v1/game/progress/${childId}/${subjectId}`,
  );
  return data;
};

export const adjustDifficulty = async (
  req: DifficultyAdjustRequest,
): Promise<DifficultyAdjustResponse> => {
  const { data } = await apiClient.post<DifficultyAdjustResponse>(
    "/api/v1/game/adjust-difficulty",
    req,
  );
  return data;
};
