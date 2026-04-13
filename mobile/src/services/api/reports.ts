import { apiClient } from "./client";
import type { SubjectId } from "../../../shared/types";

export interface MistakeRecord {
  question_text: string;
  selected_answer: string;
  correct_answer: string;
  subject: SubjectId;
}

export interface SessionLog {
  mood: "engaged" | "curious" | "struggling" | "tired";
  zones_visited: SubjectId[];
  skills_attempted: string[];   // e.g. ["reading.level_1", "math.level_2"]
  reading_accuracy: number;     // 0.0–1.0
  mistakes_log: MistakeRecord[];
}

export interface GenerateReportRequest {
  session_id: string;
  parent_uid: string;
  child_name: string;
  parent_name: string;
  session_log: SessionLog;
}

export interface ParentReport {
  summary: string;
  strengths_this_session: string[];
  areas_to_watch: string[];
  one_thing_to_do_at_home: string;
}

export interface GenerateReportResponse {
  session_id: string;
  report: ParentReport;
  stored: boolean;
}

export interface StoredReport {
  session_id: string;
  child_name: string;
  created_at: string;           // ISO-8601
  summary: string;
  strengths_this_session: string[];
  areas_to_watch: string[];
  one_thing_to_do_at_home: string;
  zones_visited: SubjectId[];
}

export const generateReport = async (
  req: GenerateReportRequest,
): Promise<GenerateReportResponse> => {
  const { data } = await apiClient.post<GenerateReportResponse>(
    "/api/v1/reports/generate",
    req,
  );
  return data;
};

export const fetchReports = async (
  parentUid: string,
  limit = 20,
): Promise<StoredReport[]> => {
  const { data } = await apiClient.get<StoredReport[]>(
    `/api/v1/reports/${parentUid}`,
    { params: { limit } },
  );
  return data;
};
