from datetime import datetime, timezone
from functools import lru_cache
from uuid import uuid4

from sqlalchemy import DateTime, Enum, JSON, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from backend.config import get_settings
from contracts.enums import (
    AnalysisMode,
    CaseStatus,
    Decision,
    EvidenceReqStatus,
    EvidenceSource,
    FindingKind,
    ReviewStatus,
    RunStatus,
    SourceMode,
    SourceType,
    Uncertainty,
)


class Base(DeclarativeBase):
    pass


class CaseRecord(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_code: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    product_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    product_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    complaint_text: Mapped[str] = mapped_column(Text)
    source_mode: Mapped[SourceMode] = mapped_column(Enum(SourceMode), nullable=False)
    status: Mapped[CaseStatus] = mapped_column(Enum(CaseStatus), default=CaseStatus.new, nullable=False)
    created_by: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    first_opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EvidenceRecord(Base):
    __tablename__ = "evidence_files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String(36), index=True)
    source_type: Mapped[EvidenceSource] = mapped_column(Enum(EvidenceSource), nullable=False)
    fixture_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    quality_flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    fixture_visible_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    fixture_visible_fact: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FindingRecord(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String(36), index=True)
    local_id: Mapped[str] = mapped_column(String(50))
    kind: Mapped[FindingKind] = mapped_column(Enum(FindingKind), nullable=False)
    text: Mapped[str] = mapped_column(Text)
    original_text: Mapped[str] = mapped_column(Text)
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType), nullable=False)
    evidence_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    exact_quote: Mapped[str | None] = mapped_column(Text, nullable=True)
    claim_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    uncertainty: Mapped[Uncertainty] = mapped_column(Enum(Uncertainty), nullable=False)
    review_status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus), default=ReviewStatus.provisional, nullable=False)


class EvidenceRequestRecord(Base):
    __tablename__ = "evidence_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String(36), index=True)
    code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    requested_item: Mapped[str] = mapped_column(Text)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[EvidenceReqStatus] = mapped_column(Enum(EvidenceReqStatus), default=EvidenceReqStatus.open, nullable=False)
    created_by: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AnalysisRunRecord(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String(36), index=True)
    mode: Mapped[AnalysisMode] = mapped_column(Enum(AnalysisMode), nullable=False)
    model_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[RunStatus] = mapped_column(Enum(RunStatus), nullable=False)
    input_image_count: Mapped[int] = mapped_column(default=0)
    flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    validation_issues: Mapped[list[dict]] = mapped_column(JSON, default=list)
    usage: Mapped[dict] = mapped_column(JSON, default=dict)
    result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ReviewDecisionRecord(Base):
    __tablename__ = "review_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String(36), index=True)
    reviewer: Mapped[str] = mapped_column(String(200))
    decision: Mapped[Decision] = mapped_column(Enum(Decision), nullable=False)
    rationale: Mapped[str] = mapped_column(Text)
    idempotency_key: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AuditEventRecord(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String(36), index=True)
    actor: Mapped[str] = mapped_column(String(200))
    entity_type: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100))
    previous_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


@lru_cache
def get_engine():
    settings = get_settings()
    connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
    return create_engine(settings.database_url, connect_args=connect_args)


@lru_cache
def get_session_factory():
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def initialize_database() -> None:
    Base.metadata.create_all(get_engine())


def get_session():
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def get_case(session: Session, case_id: str) -> CaseRecord | None:
    return session.get(CaseRecord, case_id)


def list_cases(session: Session, status: str | None = None, query: str | None = None) -> list[CaseRecord]:
    statement = select(CaseRecord).order_by(CaseRecord.created_at.desc())
    if status:
        statement = statement.where(CaseRecord.status == status)
    if query:
        statement = statement.where(CaseRecord.case_code.ilike(f"%{query}%"))
    return list(session.scalars(statement))
