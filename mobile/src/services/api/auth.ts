import { apiClient } from "./client";

export interface ParentProfile {
  uid: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch (or lazily create) the parent's Firestore profile. */
export const getMe = async (): Promise<ParentProfile> => {
  const { data } = await apiClient.get<ParentProfile>("/api/v1/auth/me");
  return data;
};
