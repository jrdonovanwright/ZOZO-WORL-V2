import { apiClient } from "./client";

export interface ChildProfile {
  id: string;
  parent_id: string;
  name: string;
  age: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const createChild = async (name: string, age: number): Promise<ChildProfile> => {
  const { data } = await apiClient.post<ChildProfile>("/api/v1/children", { name, age });
  return data;
};

export const getChildren = async (): Promise<ChildProfile[]> => {
  const { data } = await apiClient.get<ChildProfile[]>("/api/v1/children");
  return data;
};
