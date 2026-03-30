import { apiClient } from "./client";
import type { SubjectId } from "../../../shared/types";

export type FollowUpActivityType = "multiple-choice" | "drag-drop" | "read-aloud" | "conversation";

export interface GenerateLessonRequest {
  skill_id: string;                  // e.g. "reading.level_1"
  grade_level: string;               // e.g. "Kindergarten"
  child_name: string;
  child_age: number;
  prior_misconceptions: string[];    // plain-language strings
}

export interface GenerateLessonResponse {
  script: string;
  follow_up_activity_type: FollowUpActivityType;
  lesson_title: string;
  key_concept: string;
  tts_url: string | null;
  estimated_duration_seconds: number;
}

export const generateLesson = async (
  req: GenerateLessonRequest,
): Promise<GenerateLessonResponse> => {
  const { data } = await apiClient.post<GenerateLessonResponse>(
    "/api/v1/lesson/generate",
    req,
  );
  return data;
};

/** Derive a skill node ID from subject + current level. */
export function skillId(subjectId: SubjectId, level: number): string {
  return `${subjectId}.level_${level}`;
}

/** Derive grade-level label from child age. */
export function gradeLevel(age: number): string {
  if (age <= 4) return "Pre-K";
  if (age === 5) return "Kindergarten";
  if (age === 6) return "1st grade";
  if (age === 7) return "2nd grade";
  if (age === 8) return "3rd grade";
  return "3rd-4th grade";
}
