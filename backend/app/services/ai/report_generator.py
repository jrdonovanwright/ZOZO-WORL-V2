"""
Parent Intelligence Report generator.

Calls GPT-4o to produce a plain-language session summary, then writes the
result to users/{uid}/parentReports/{session_id} in Firestore.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.models.report import (
    GenerateReportRequest,
    GenerateReportResponse,
    ParentReport,
    StoredReport,
)
from app.services.firebase.firestore import save_parent_report

logger = logging.getLogger(__name__)
_client = AsyncOpenAI()

PROMPTS_DIR = Path(__file__).parents[5] / "shared" / "prompts"


@lru_cache(maxsize=1)
def _load_prompt() -> str:
    return (PROMPTS_DIR / "report" / "generate.md").read_text()


def _build_user_message(req: GenerateReportRequest) -> str:
    log = req.session_log
    if log.mistakes_log:
        mistakes_text = "\n".join(
            f"  - [{m.subject}] Child chose \"{m.selected_answer}\" "
            f"(correct: \"{m.correct_answer}\")"
            for m in log.mistakes_log
        )
    else:
        mistakes_text = "  None — clean session!"

    return (
        f"Child name: {req.child_name}\n"
        f"Parent name: {req.parent_name}\n"
        f"\n"
        f"Session log:\n"
        f"  Mood / engagement: {log.mood}\n"
        f"  Zones visited: {', '.join(log.zones_visited) or 'none'}\n"
        f"  Skills attempted: {', '.join(log.skills_attempted) or 'none'}\n"
        f"  Reading accuracy: {round(log.reading_accuracy * 100)}%\n"
        f"  Mistakes ({len(log.mistakes_log)}):\n"
        f"{mistakes_text}\n"
        f"\n"
        f"Return a JSON object with keys: summary, strengthsThisSession, "
        f"areasToWatch, oneThingToDoAtHome."
    )


async def generate_report(req: GenerateReportRequest) -> GenerateReportResponse:
    prompt = _load_prompt()
    user_msg = _build_user_message(req)

    response = await _client.chat.completions.create(
        model="gpt-4o-2024-11-20",
        response_format={"type": "json_object"},
        temperature=0.75,
        max_tokens=600,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_msg},
        ],
    )

    raw = json.loads(response.choices[0].message.content or "{}")

    report = ParentReport(
        summary=raw.get("summary", ""),
        strengths_this_session=raw.get("strengthsThisSession", []),
        areas_to_watch=raw.get("areasToWatch", []),
        one_thing_to_do_at_home=raw.get("oneThingToDoAtHome", ""),
    )

    stored = True
    try:
        stored_doc = StoredReport(
            session_id=req.session_id,
            child_name=req.child_name,
            created_at=datetime.now(timezone.utc).isoformat(),
            summary=report.summary,
            strengths_this_session=report.strengths_this_session,
            areas_to_watch=report.areas_to_watch,
            one_thing_to_do_at_home=report.one_thing_to_do_at_home,
            zones_visited=req.session_log.zones_visited,
        )
        await save_parent_report(req.parent_uid, req.session_id, stored_doc.model_dump())
    except Exception:
        logger.exception(
            "Failed to store report in Firebase | uid=%s session=%s",
            req.parent_uid,
            req.session_id,
        )
        stored = False

    return GenerateReportResponse(session_id=req.session_id, report=report, stored=stored)
