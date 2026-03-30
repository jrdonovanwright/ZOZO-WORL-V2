from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class MistakeRecord(BaseModel):
    question_text: str
    selected_answer: str
    correct_answer: str
    subject: str  # SubjectId string e.g. "reading"


class SessionLog(BaseModel):
    mood: str  # "engaged" | "curious" | "struggling" | "tired"
    zones_visited: list[str] = []       # SubjectId strings visited this session
    skills_attempted: list[str] = []    # skill node IDs e.g. "reading.level_1"
    reading_accuracy: float = Field(default=0.0, ge=0.0, le=1.0)
    mistakes_log: list[MistakeRecord] = []


class GenerateReportRequest(BaseModel):
    session_id: str
    parent_uid: str     # Firebase UID — report stored at users/{uid}/parentReports/{session_id}
    child_name: str
    parent_name: str
    session_log: SessionLog


class ParentReport(BaseModel):
    summary: str
    strengths_this_session: list[str]
    areas_to_watch: list[str]
    one_thing_to_do_at_home: str


class StoredReport(BaseModel):
    """Shape written to / read from Firestore."""
    session_id: str
    child_name: str
    created_at: str             # ISO-8601 UTC
    summary: str
    strengths_this_session: list[str]
    areas_to_watch: list[str]
    one_thing_to_do_at_home: str
    zones_visited: list[str]


class GenerateReportResponse(BaseModel):
    session_id: str
    report: ParentReport
    stored: bool = True         # False if Firebase write failed — report still returned to client
