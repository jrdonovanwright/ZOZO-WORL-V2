import { apiClient } from "./client";
import type { SubjectId, ChildProgress } from "../../../shared/types";

export interface SubjectProgressSummary {
  subject_id: SubjectId;
  level: number;
  accuracy_rate: number;
  questions_answered: number;
  last_played: string | null;
}

export interface WorldGreetingRequest {
  child_id: string;
  child_name: string;
  child_age: number;
  time_of_day: "morning" | "afternoon" | "evening";
  subject_progress: SubjectProgressSummary[];
}

export interface WorldGreetingResponse {
  greeting: string;
  recommended_zone: SubjectId;
  tts_url: string | null;
}

export const fetchWorldGreeting = async (
  req: WorldGreetingRequest,
): Promise<WorldGreetingResponse> => {
  const { data } = await apiClient.post<WorldGreetingResponse>(
    "/api/v1/world/greeting",
    req,
  );
  return data;
};

/** Convert ChildProgress (from game API) to the summary shape the world API expects. */
export function progressToSummary(p: ChildProgress): SubjectProgressSummary {
  return {
    subject_id: p.subject_id as SubjectId,
    level: p.level,
    accuracy_rate: p.accuracy_rate,
    questions_answered: p.questions_answered,
    last_played: p.last_played ?? null,
  };
}
