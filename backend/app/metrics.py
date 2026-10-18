from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.deps import get_reviewer
from backend.db import AnalysisRunRecord, CaseRecord, FindingRecord, get_session
from contracts.enums import CaseStatus, RunStatus, ReviewStatus

router = APIRouter(prefix="/api", tags=["metrics"])


@router.get("/metrics")
def get_metrics(
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
) -> dict:
    cases_total = session.scalar(select(func.count()).select_from(CaseRecord)) or 0
    analyses_total = session.scalar(select(func.count()).select_from(AnalysisRunRecord)) or 0
    analyses_failed = session.scalar(
        select(func.count()).select_from(AnalysisRunRecord).where(AnalysisRunRecord.status == RunStatus.failed)
    ) or 0
    findings_total = session.scalar(select(func.count()).select_from(FindingRecord)) or 0
    edited_findings = session.scalar(
        select(func.count()).select_from(FindingRecord).where(FindingRecord.review_status == ReviewStatus.edited)
    ) or 0

    by_status = {
        status.value: session.scalar(
            select(func.count()).select_from(CaseRecord).where(CaseRecord.status == status)
        ) or 0
        for status in CaseStatus
    }
    return {
        "cases_total": cases_total,
        "by_status": by_status,
        "median_handling_seconds": None,
        "evidence_request_rate": None,
        "finding_edit_rate": (edited_findings / findings_total) if findings_total else None,
        "analyses_total": analyses_total,
        "analyses_failed": analyses_failed,
        "mean_analysis_ms": None,
        "total_estimated_cost_inr": None,
        "cost_per_reviewed_case_inr": None,
        "latest_eval": None,
        "disclosures": ["Handling time is wall-clock time when measured; absent data is null."],
    }
