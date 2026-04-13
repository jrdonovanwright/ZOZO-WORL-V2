import { apiClient } from "./client";

export interface ChallengeStep {
  day: string;
  activity_type: "game" | "lesson" | "conversation";
  skill_id: string;
  description: string;
  completed: boolean;
  completed_at: string | null;
}

export interface WeeklyChallenge {
  week_id: string;
  child_name: string;
  grade_level: string;
  challenge_title: string;
  description: string;
  zoey_intro_line: string;
  steps: ChallengeStep[];
  reward_badge: string;
  created_at: string;
  completed_at: string | null;
}

export interface GenerateChallengeRequest {
  child_id: string;
  child_name: string;
  grade_level: string;
  top_weak_skills: string[];
  interests: string[];
}

export const generateChallenge = async (
  req: GenerateChallengeRequest,
): Promise<{ challenge: WeeklyChallenge }> => {
  const { data } = await apiClient.post<{ challenge: WeeklyChallenge }>(
    "/api/v1/challenges/generate",
    req,
  );
  return data;
};

export const fetchCurrentChallenge = async (
  childId: string,
): Promise<WeeklyChallenge | null> => {
  try {
    const { data } = await apiClient.get<WeeklyChallenge>(
      `/api/v1/challenges/${childId}/current`,
    );
    return data;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
};

export const completeStep = async (
  childId: string,
  weekId: string,
  day: string,
): Promise<WeeklyChallenge> => {
  const { data } = await apiClient.post<WeeklyChallenge>(
    `/api/v1/challenges/${childId}/${weekId}/complete-step`,
    { child_id: childId, day },
  );
  return data;
};
