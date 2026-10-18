import json
import hashlib
import csv
import io
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from analysis import analyze, check_image
from backend.app.deps import get_reviewer
from backend.config import get_settings
from backend.storage import get_storage
from backend.db import (
    AnalysisRunRecord,
    AuditEventRecord,
    CaseRecord,
    EvidenceRecord,
    EvidenceRequestRecord,
    FindingRecord,
    ReviewDecisionRecord,
    get_case,
    get_session,
    list_cases,
)
from contracts.enums import CaseStatus, EvidenceSource, FindingKind, ReviewStatus, RunStatus, SourceMode
from contracts.models import AnalysisEvidence, AnalysisOptions, AnalysisRequest, AnalysisTrigger, CaseCreate, CaseDetail, CaseResponse, EvidenceRequestCreate, EvidenceRequestResponse, EvidenceResponse, Finding, FindingPatch, FindingPatchResponse, FixtureImportResponse, ReviewRequest, ReviewResponse

router = APIRouter(prefix="/api/cases", tags=["cases"])
fixtures_router = APIRouter(prefix="/api/fixtures", tags=["fixtures"])
evidence_router = APIRouter(prefix="/api/evidence", tags=["evidence"])


def build_case_detail(session: Session, case: CaseRecord) -> CaseDetail:
    evidence_rows = list(session.scalars(select(EvidenceRecord).where(EvidenceRecord.case_id == case.id)))
    finding_rows = list(session.scalars(select(FindingRecord).where(FindingRecord.case_id == case.id)))
    request_rows = list(session.scalars(select(EvidenceRequestRecord).where(EvidenceRequestRecord.case_id == case.id)))
    decision_rows = list(session.scalars(select(ReviewDecisionRecord).where(ReviewDecisionRecord.case_id == case.id)))
    audit_rows = list(session.scalars(select(AuditEventRecord).where(AuditEventRecord.case_id == case.id)))
    latest_run = session.scalar(
        select(AnalysisRunRecord)
        .where(AnalysisRunRecord.case_id == case.id)
        .order_by(AnalysisRunRecord.created_at.desc())
    )

    findings = [
        Finding(
            id=row.id,
            local_id=row.local_id,
            kind=row.kind,
            text=row.text,
            original_text=row.original_text,
            source_type=row.source_type,
            evidence_id=row.evidence_id,
            exact_quote=row.exact_quote,
            claim_type=row.claim_type,
            uncertainty=row.uncertainty,
            review_status=row.review_status,
        )
        for row in finding_rows
    ]
    flags = [] if latest_run is None else latest_run.flags
    evidence = [
        EvidenceResponse(
            id=row.id,
            case_id=row.case_id,
            source_type=row.source_type,
            fixture_path=row.fixture_path,
            mime_type=row.mime_type,
            file_size_bytes=row.file_size_bytes,
            sha256=row.sha256,
            quality_flags=row.quality_flags,
            image_url=f"/api/evidence/{row.id}/image" if row.storage_path else None,
            fixture_visible_description=row.fixture_visible_description,
            created_at=row.created_at,
        )
        for row in evidence_rows
    ]
    return CaseDetail(
        case=CaseResponse.model_validate(case),
        evidence=evidence,
        findings=findings,
        flags=flags,
        evidence_requests=request_rows,
        latest_analysis=latest_run,
        decisions=decision_rows,
        audit=audit_rows,
        provisional=case.status != CaseStatus.confirmed,
    )


@router.post("/{case_id}/evidence", response_model=EvidenceResponse, status_code=201)
async def upload_evidence(
    case_id: str,
    file: UploadFile = File(...),
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
) -> EvidenceRecord:
    case = get_case(session, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    allowed_types = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    extension = Path(file.filename or "").suffix.lower().lstrip(".")
    if file.content_type not in allowed_types or extension not in {"jpg", "jpeg", "png", "webp"}:
        raise HTTPException(status_code=415, detail="Unsupported file")

    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    digest = hashlib.sha256(data).hexdigest()
    duplicate = session.scalar(
        select(EvidenceRecord).where(
            EvidenceRecord.case_id == case_id,
            EvidenceRecord.sha256 == digest,
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail="Duplicate evidence")

    try:
        quality = check_image(data)
    except Exception as error:
        raise HTTPException(status_code=415, detail=f"Unsupported file: {error}") from error

    evidence = EvidenceRecord(
        case_id=case_id,
        source_type="upload",
        mime_type=file.content_type,
        file_size_bytes=len(data),
        sha256=digest,
        quality_flags=list(quality.flags),
    )
    extension = allowed_types[file.content_type]
    evidence.storage_path = f"{case_id}/{evidence.id}.{extension}"
    get_storage().put(evidence.storage_path, data, file.content_type)
    session.add(evidence)
    session.commit()
    session.refresh(evidence)
    return EvidenceResponse(
        id=evidence.id,
        case_id=evidence.case_id,
        source_type=evidence.source_type,
        fixture_path=evidence.fixture_path,
        mime_type=evidence.mime_type,
        file_size_bytes=evidence.file_size_bytes,
        sha256=evidence.sha256,
        quality_flags=evidence.quality_flags,
        image_url=f"/api/evidence/{evidence.id}/image",
        fixture_visible_description=evidence.fixture_visible_description,
        created_at=evidence.created_at,
    )


@evidence_router.get("/{evidence_id}/image")
def get_evidence_image(
    evidence_id: str,
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
):
    from fastapi.responses import Response

    evidence = session.get(EvidenceRecord, evidence_id)
    if evidence is None or evidence.storage_path is None:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return Response(content=get_storage().get(evidence.storage_path), media_type=evidence.mime_type)


@router.post("", response_model=CaseResponse, status_code=201)
def create_case(
    payload: CaseCreate,
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
) -> CaseRecord:
    case = CaseRecord(
        case_code=payload.case_code,
        product_id=payload.product_id,
        product_title=payload.product_title,
        complaint_text=payload.complaint_text,
        source_mode=payload.source_mode,
        status=CaseStatus.new,
        created_by=reviewer,
    )
    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@router.get("", response_model=list[CaseResponse])
def get_cases(
    status: str | None = Query(default=None),
    q: str | None = Query(default=None),
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
) -> list[CaseRecord]:
    return list_cases(session, status=status, query=q)


@router.get("/{case_id}/export")
def export_case(
    case_id: str,
    format: str = Query(default="json", pattern="^(json|csv)$"),
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
):
    case = get_case(session, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    detail = build_case_detail(session, case)
    provisional_marker = "PROVISIONAL - NOT REVIEWED"

    if format == "json":
        payload = detail.model_dump(mode="json")
        payload["generated_at"] = datetime.now(timezone.utc).isoformat()
        payload["provisional"] = detail.provisional
        payload["disclosures"] = [
            provisional_marker if detail.provisional else "",
            "No automatic refund, fraud or authenticity verdict is made.",
        ]
        return Response(
            content=json.dumps(payload, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{case.case_code or case.id}.json"'},
        )

    output = io.StringIO()
    if detail.provisional:
        output.write(f"{provisional_marker}\n")
    writer = csv.writer(output)
    writer.writerow([
        "case_code", "item_type", "kind", "text", "source_type",
        "uncertainty", "review_status", "evidence_ref", "created_at",
    ])
    for finding in detail.findings:
        writer.writerow([
            case.case_code or "",
            "finding",
            finding.kind,
            finding.text,
            finding.source_type,
            finding.uncertainty,
            finding.review_status,
            finding.evidence_id or "",
            case.updated_at.isoformat(),
        ])
    for request in detail.evidence_requests:
        writer.writerow([
            case.case_code or "",
            "evidence_request",
            "",
            request.requested_item,
            "system_rule",
            "unknown",
            request.status,
            "",
            request.created_at.isoformat(),
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{case.case_code or case.id}.csv"'},
    )


@router.get("/{case_id}", response_model=CaseDetail)
def get_case_detail(
    case_id: str,
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
) -> CaseRecord:
    case = get_case(session, case_id)
    if case is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Case not found")
    if case.first_opened_at is None:
        case.first_opened_at = datetime.now(timezone.utc)
        case.updated_at = case.first_opened_at
        session.commit()
        session.refresh(case)
    return build_case_detail(session, case)


@router.post("/{case_id}/analysis", response_model=CaseDetail)
def analyze_case(
    case_id: str,
    payload: AnalysisTrigger | None = None,
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
) -> dict:
    case = get_case(session, case_id)
    if case is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Case not found")

    pending = session.scalar(
        select(AnalysisRunRecord).where(
            AnalysisRunRecord.case_id == case_id,
            AnalysisRunRecord.status == RunStatus.pending,
        )
    )
    if pending is not None:
        from fastapi import HTTPException

        raise HTTPException(status_code=409, detail="Analysis is already in progress")

    evidence_rows = list(
        session.scalars(
            select(EvidenceRecord).where(EvidenceRecord.case_id == case_id)
        )
    )
    request = AnalysisRequest(
        case_id=case.id,
        case_code=case.case_code,
        product_id=case.product_id,
        product_title=case.product_title,
        complaint_text=case.complaint_text,
        source_mode=case.source_mode,
        evidence=[
            AnalysisEvidence(
                evidence_id=evidence.id,
                source_type=evidence.source_type,
                fixture_visible_description=evidence.fixture_visible_description,
                fixture_visible_fact=evidence.fixture_visible_fact,
                quality_flags=evidence.quality_flags,
            )
            for evidence in evidence_rows
        ],
        options=AnalysisOptions(analyzer=(payload.analyzer if payload else "auto")),
    )
    run = AnalysisRunRecord(
        case_id=case.id,
        mode="rules",
        status=RunStatus.pending,
        input_image_count=0,
    )
    session.add(run)
    session.flush()

    try:
        result = analyze(request)
        result_json = result.model_dump(mode="json")
        run.mode = result.mode
        run.status = RunStatus.success
        run.model_id = result.model_id
        run.prompt_version = result.prompt_version
        run.flags = [flag.value if hasattr(flag, "value") else flag for flag in result.flags]
        run.validation_issues = [issue.model_dump(mode="json") for issue in result.validation_issues]
        run.usage = result.usage.model_dump(mode="json")
        run.result_json = result_json

        for finding in result.findings:
            session.add(
                FindingRecord(
                    case_id=case.id,
                    local_id=finding.local_id,
                    kind=finding.kind,
                    text=finding.text,
                    original_text=finding.original_text,
                    source_type=finding.source_type,
                    evidence_id=finding.evidence_id,
                    exact_quote=finding.exact_quote,
                    claim_type=finding.claim_type,
                    uncertainty=finding.uncertainty,
                    review_status=finding.review_status,
                )
            )
        for item in result.evidence_requests:
            session.add(
                EvidenceRequestRecord(
                    case_id=case.id,
                    code=item.code,
                    requested_item=item.requested_item,
                    reason=item.reason,
                    created_by=reviewer,
                )
            )
        case.status = CaseStatus.needs_review
        case.updated_at = datetime.now(timezone.utc)
        session.commit()
        return build_case_detail(session, case)
    except Exception as error:
        session.rollback()
        failed_run = session.get(AnalysisRunRecord, run.id)
        if failed_run is not None:
            failed_run.status = RunStatus.failed
            failed_run.validation_issues = [{"code": "ANALYSIS_FAILED", "message": str(error), "local_id": None}]
            session.commit()
        raise


@router.post("/{case_id}/review", response_model=ReviewResponse)
def review_case(
    case_id: str,
    payload: ReviewRequest,
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
) -> ReviewResponse:
    case = get_case(session, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    latest_decision = session.scalar(
        select(ReviewDecisionRecord)
        .where(ReviewDecisionRecord.case_id == case_id)
        .order_by(ReviewDecisionRecord.created_at.desc())
    )
    if latest_decision is not None and (
        latest_decision.idempotency_key == payload.idempotency_key
        or (
            latest_decision.decision == payload.decision
            and latest_decision.rationale == payload.rationale
        )
    ):
        return ReviewResponse(
            decision=payload.decision,
            case_status=case.status,
            duplicate=True,
        )

    successful_run = session.scalar(
        select(AnalysisRunRecord).where(
            AnalysisRunRecord.case_id == case_id,
            AnalysisRunRecord.status == RunStatus.success,
        )
    )
    if successful_run is None:
        raise HTTPException(status_code=409, detail="Analysis is required")
    if case.status == CaseStatus.confirmed:
        raise HTTPException(status_code=409, detail="Case is already confirmed")

    if payload.decision == "confirm_summary":
        provisional_findings = session.scalars(
            select(FindingRecord).where(
                FindingRecord.case_id == case_id,
                FindingRecord.review_status == ReviewStatus.provisional,
            )
        ).all()
        if get_settings().reviewer_confirmation_required and provisional_findings:
            raise HTTPException(status_code=409, detail="Unreviewed findings")

    status_by_decision = {
        "request_evidence": CaseStatus.needs_more_evidence,
        "escalate": CaseStatus.escalated,
        "confirm_summary": CaseStatus.confirmed,
    }
    previous_status = case.status.value if hasattr(case.status, "value") else case.status
    case.status = status_by_decision[payload.decision]
    case.updated_at = datetime.now(timezone.utc)
    decision = ReviewDecisionRecord(
        case_id=case_id,
        reviewer=reviewer,
        decision=payload.decision,
        rationale=payload.rationale,
        idempotency_key=payload.idempotency_key,
    )
    session.add(decision)
    session.add(
        AuditEventRecord(
            case_id=case_id,
            actor=reviewer,
            entity_type="case",
            entity_id=case_id,
            event_type="review_decision",
            previous_value={"status": previous_status},
            new_value={"status": case.status.value},
        )
    )
    session.commit()
    return ReviewResponse(
        decision=payload.decision,
        case_status=case.status,
        duplicate=False,
    )


@router.patch("/{case_id}/findings/{finding_id}", response_model=FindingPatchResponse)
def patch_finding(
    case_id: str,
    finding_id: str,
    payload: FindingPatch,
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
) -> FindingPatchResponse:
    finding = session.scalar(
        select(FindingRecord).where(
            FindingRecord.id == finding_id,
            FindingRecord.case_id == case_id,
        )
    )
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found")

    previous = {"text": finding.text, "review_status": finding.review_status.value}
    if payload.text is not None:
        finding.text = payload.text
        finding.review_status = ReviewStatus.edited
    if payload.review_status is not None:
        finding.review_status = payload.review_status
    updated = {
        "text": finding.text,
        "review_status": finding.review_status.value,
    }
    session.add(
        AuditEventRecord(
            case_id=case_id,
            actor=reviewer,
            entity_type="finding",
            entity_id=finding.id,
            event_type="finding_updated",
            previous_value=previous,
            new_value=updated,
        )
    )
    session.commit()
    return FindingPatchResponse(
        finding=Finding(
            id=finding.id,
            local_id=finding.local_id,
            kind=finding.kind,
            text=finding.text,
            original_text=finding.original_text,
            source_type=finding.source_type,
            evidence_id=finding.evidence_id,
            exact_quote=finding.exact_quote,
            claim_type=finding.claim_type,
            uncertainty=finding.uncertainty,
            review_status=finding.review_status,
        ),
        warnings=[],
    )


@router.post("/{case_id}/evidence-requests", response_model=EvidenceRequestResponse, status_code=201)
def create_evidence_request(
    case_id: str,
    payload: EvidenceRequestCreate,
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
) -> EvidenceRequestRecord:
    case = get_case(session, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    request = EvidenceRequestRecord(
        case_id=case_id,
        code=payload.code,
        requested_item=payload.requested_item,
        reason=payload.reason,
        created_by=reviewer,
    )
    session.add(request)
    session.flush()
    session.add(
        AuditEventRecord(
            case_id=case_id,
            actor=reviewer,
            entity_type="evidence_request",
            entity_id=request.id,
            event_type="evidence_request_created",
            previous_value=None,
            new_value={
                "requested_item": payload.requested_item,
                "reason": payload.reason,
                "code": payload.code,
            },
        )
    )
    session.commit()
    session.refresh(request)
    return request


@fixtures_router.post("/import", response_model=FixtureImportResponse)
def import_fixture(
    reviewer: str = Depends(get_reviewer),
    session: Session = Depends(get_session),
) -> FixtureImportResponse:
    fixture_path = Path(__file__).resolve().parents[2] / "fixture.json"
    with fixture_path.open(encoding="utf-8") as fixture_file:
        fixture = json.load(fixture_file)

    image_by_product = {
        image["product_id"]: image
        for image in fixture["records"]["images"]
    }
    imported: list[str] = []
    skipped = 0

    for complaint in fixture["records"]["complaints"]:
        case_code = complaint["case_id"]
        existing = session.scalar(
            select(CaseRecord).where(CaseRecord.case_code == case_code)
        )
        if existing is not None:
            skipped += 1
            continue

        image_path = complaint.get("image")
        image_record = None
        if image_path is not None:
            product_id = Path(image_path).stem
            image_record = image_by_product.get(product_id)

        case = CaseRecord(
            id=str(uuid4()),
            case_code=case_code,
            product_id=image_record["product_id"] if image_record else None,
            product_title=image_record["metadata_title"] if image_record else None,
            complaint_text=complaint["customer_statement"],
            source_mode=SourceMode.fixture,
            status=CaseStatus.new,
            created_by=reviewer,
        )
        session.add(case)

        if image_record is not None:
            session.add(
                EvidenceRecord(
                    id=str(uuid4()),
                    case_id=case.id,
                    source_type=EvidenceSource.fixture_reference,
                    fixture_path=image_record["path"],
                    quality_flags=[],
                    fixture_visible_description=image_record["visible_description"],
                    fixture_visible_fact=complaint["visible_fact"],
                )
            )
        imported.append(case_code)

    session.commit()
    return FixtureImportResponse(
        imported=len(imported),
        skipped=skipped,
        case_codes=imported,
    )
