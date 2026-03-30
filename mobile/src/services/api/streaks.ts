import { apiClient } from "./client";

export type StreakStatus = "active" | "at-risk";

export interface StreakResponse {
  current_streak: number;
  longest_streak: number;
  streak_status: StreakStatus;
  last_active_date: string | null;
  plant_stage: number;              // 0–7
  already_recorded_today: boolean;
}

export interface StreakCommentaryResponse {
  commentary: string;
  tts_url: string | null;
}

export const fetchStreak = async (childId: string): Promise<StreakResponse> => {
  const { data } = await apiClient.get<StreakResponse>(`/api/v1/streaks/${childId}`);
  return data;
};

export const recordActivity = async (childId: string): Promise<StreakResponse> => {
  const { data } = await apiClient.post<StreakResponse>(
    `/api/v1/streaks/${childId}/record`,
    { child_id: childId },
  );
  return data;
};

export const fetchStreakCommentary = async (
  childId: string,
  childName: string,
  timeOfDay: "morning" | "afternoon" | "evening",
): Promise<StreakCommentaryResponse> => {
  const { data } = await apiClient.post<StreakCommentaryResponse>(
    `/api/v1/streaks/${childId}/commentary`,
    { child_id: childId, child_name: childName, time_of_day: timeOfDay },
  );
  return data;
};
