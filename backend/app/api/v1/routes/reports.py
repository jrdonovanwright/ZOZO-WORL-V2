"""
Parent reports API routes.

POST /api/v1/reports/generate       — generate + store a parent intelligence report
GET  /api/v1/reports/{uid}          — list stored reports for a parent (newest first)
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query, status

from app.models.report import GenerateReportRequest, GenerateReportResponse, StoredReport
from app.services.ai.report_generator import generate_report
from app.services.firebase.firestore import list_parent_reports

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/generate",
    response_model=GenerateReportResponse,
    summary="Generate a parent intelligence report for a completed session",
)
async def generate_parent_report(req: GenerateReportRequest) -> GenerateReportResponse:
    try:
        return await generate_report(req)
    except Exception:
        logger.exception(
            "Report generation failed | uid=%s session=%s child=%s",
            req.parent_uid,
            req.session_id,
            req.child_name,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't generate the report right now. Please try again later.",
        )


@router.get(
    "/{uid}",
    response_model=list[StoredReport],
    summary="List stored parent reports, newest first",
)
async def get_parent_reports(
    uid: str,
    limit: int = Query(default=20, ge=1, le=100),
) -> list[StoredReport]:
    try:
        raw = await list_parent_reports(uid, limit=limit)
        return [StoredReport(**doc) for doc in raw]
    except Exception:
        logger.exception("Failed to fetch reports | uid=%s", uid)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't load reports right now.",
        )
