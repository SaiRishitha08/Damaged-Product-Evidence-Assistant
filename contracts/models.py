from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .enums import (
    AnalysisMode,
    AnalyzerMode,
    CaseStatus,
    ClaimType,
    Decision,
    EvidenceReqStatus,
    EvidenceSource,
    FindingKind,
    FlagCode,
    ReviewStatus,
    RunStatus,
    SourceMode,
    SourceType,
    Uncertainty,
)


class Finding(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str | None = None
    local_id: str
    kind: FindingKind
    text: str
    original_text: str
    source_type: SourceType
    evidence_id: str | None = None
    exact_quote: str | None = None
    claim_type: ClaimType | None = None
    uncertainty: Uncertainty = Uncertainty.unknown
    review_status: ReviewStatus = ReviewStatus.provisional


class EvidenceRequestItem(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    code: FlagCode | None = None
    requested_item: str
    reason: str


class AnalysisUsage(BaseModel):
    input_tokens: int | None = None
    output_tokens: int | None = None
    duration_ms: int | None = None
    estimated_cost_inr: float | None = None


class ValidationIssue(BaseModel):
    code: str
    message: str
    local_id: str | None = None


class AnalysisResult(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    mode: AnalysisMode
    model_id: str | None = None
    prompt_version: str | None = None
    findings: list[Finding] = Field(default_factory=list)
    flags: list[FlagCode] = Field(default_factory=list)
    evidence_requests: list[EvidenceRequestItem] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    validation_issues: list[ValidationIssue] = Field(default_factory=list)
    requires_human_review: Literal[True] = True
    usage: AnalysisUsage = Field(default_factory=AnalysisUsage)


class AnalysisEvidence(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, use_enum_values=True)

    evidence_id: str
    source_type: EvidenceSource
    image_bytes: bytes | None = None
    mime_type: str | None = None
    fixture_visible_description: str | None = None
    fixture_visible_fact: str | None = None
    quality_flags: list[FlagCode] = Field(default_factory=list)


class AnalysisOptions(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    analyzer: AnalyzerMode = AnalyzerMode.auto
    flags_enabled: bool = True
    prompt_version: str = "v1"


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    case_id: str
    case_code: str | None = None
    product_id: str | None = None
    product_title: str | None = None
    complaint_text: str = Field(min_length=1, max_length=5000)
    source_mode: SourceMode
    evidence: list[AnalysisEvidence] = Field(default_factory=list)
    options: AnalysisOptions = Field(default_factory=AnalysisOptions)


class QualityReport(BaseModel):
    width: int
    height: int
    blur_score: float
    exif_datetime: str | None = None
    flags: list[FlagCode] = Field(default_factory=list)


class CaseCreate(BaseModel):
    case_code: str | None = None
    product_id: str | None = None
    product_title: str | None = None
    complaint_text: str = Field(min_length=1, max_length=5000)
    source_mode: SourceMode


class CaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str
    case_code: str | None = None
    product_id: str | None = None
    product_title: str | None = None
    complaint_text: str
    source_mode: SourceMode
    status: CaseStatus
    created_by: str
    created_at: datetime
    updated_at: datetime
    first_opened_at: datetime | None = None


class AnalysisTrigger(BaseModel):
    analyzer: AnalyzerMode = AnalyzerMode.auto


class ReviewRequest(BaseModel):
    decision: Decision
    rationale: str = Field(min_length=1)
    idempotency_key: str


class ReviewResponse(BaseModel):
    decision: Decision
    case_status: CaseStatus
    duplicate: bool


class FindingPatch(BaseModel):
    text: str | None = None
    review_status: ReviewStatus | None = None


class FindingPatchResponse(BaseModel):
    finding: Finding
    warnings: list[str] = Field(default_factory=list)


class EvidenceRequestCreate(BaseModel):
    requested_item: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    code: FlagCode | None = None


class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str
    case_id: str
    source_type: EvidenceSource
    fixture_path: str | None = None
    mime_type: str | None = None
    file_size_bytes: int | None = None
    sha256: str | None = None
    quality_flags: list[FlagCode] = Field(default_factory=list)
    image_url: str | None = None
    fixture_visible_description: str | None = None
    created_at: datetime


class FixtureImportResponse(BaseModel):
    imported: int
    skipped: int
    case_codes: list[str]


class AnalysisRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str
    case_id: str
    mode: AnalysisMode
    model_id: str | None = None
    prompt_version: str | None = None
    status: RunStatus
    input_image_count: int
    flags: list[FlagCode] = Field(default_factory=list)
    validation_issues: list[dict] = Field(default_factory=list)
    usage: AnalysisUsage = Field(default_factory=AnalysisUsage)
    created_at: datetime


class EvidenceRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str
    case_id: str
    code: FlagCode | None = None
    requested_item: str
    reason: str
    status: EvidenceReqStatus
    created_by: str
    created_at: datetime


class ReviewDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str
    case_id: str
    reviewer: str
    decision: Decision
    rationale: str
    idempotency_key: str | None = None
    created_at: datetime


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: str
    case_id: str
    actor: str
    entity_type: str
    entity_id: str | None = None
    event_type: str
    previous_value: dict | None = None
    new_value: dict | None = None
    created_at: datetime


class CaseDetail(BaseModel):
    case: CaseResponse
    evidence: list[EvidenceResponse] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    flags: list[FlagCode] = Field(default_factory=list)
    evidence_requests: list[EvidenceRequestResponse] = Field(default_factory=list)
    latest_analysis: AnalysisRunResponse | None = None
    decisions: list[ReviewDecisionResponse] = Field(default_factory=list)
    audit: list[AuditEventResponse] = Field(default_factory=list)
    provisional: bool


class ConfigResponse(BaseModel):
    reviewer_confirmation_required: bool
    uncertainty_flags_enabled: bool
    analyzer_mode: AnalyzerMode
    gemini_configured: bool
    storage_backend: str
    db_backend: str
    auth_mode: str
    app_version: str
    disclosures: list[str]


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


class ErrorResponse(BaseModel):
    error: dict[str, str | None]
