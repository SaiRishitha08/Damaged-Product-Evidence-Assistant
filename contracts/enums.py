from enum import Enum


class SourceMode(str, Enum):
    fixture = "fixture"
    live = "live"


class CaseStatus(str, Enum):
    new = "new"
    needs_review = "needs_review"
    needs_more_evidence = "needs_more_evidence"
    escalated = "escalated"
    confirmed = "confirmed"


class FindingKind(str, Enum):
    observation = "observation"
    claim = "claim"
    metadata = "metadata"
    unknown = "unknown"


class SourceType(str, Enum):
    image = "image"
    fixture_label = "fixture_label"
    metadata = "metadata"
    customer_text = "customer_text"
    reviewer = "reviewer"
    system_rule = "system_rule"


class Uncertainty(str, Enum):
    low = "low"
    moderate = "moderate"
    high = "high"
    unknown = "unknown"


class ReviewStatus(str, Enum):
    provisional = "provisional"
    accepted = "accepted"
    edited = "edited"
    rejected = "rejected"


class ClaimType(str, Enum):
    functional = "functional"
    packaging = "packaging"
    other = "other"
    unclear = "unclear"


class Decision(str, Enum):
    request_evidence = "request_evidence"
    escalate = "escalate"
    confirm_summary = "confirm_summary"


class EvidenceSource(str, Enum):
    upload = "upload"
    fixture_reference = "fixture_reference"


class AnalyzerMode(str, Enum):
    auto = "auto"
    rules = "rules"
    gemini = "gemini"
    mock = "mock"


class AnalysisMode(str, Enum):
    rules = "rules"
    gemini = "gemini"
    mock = "mock"


class RunStatus(str, Enum):
    pending = "pending"
    success = "success"
    failed = "failed"


class EvidenceReqStatus(str, Enum):
    open = "open"
    supplied = "supplied"
    cancelled = "cancelled"


class FlagCode(str, Enum):
    NO_IMAGE = "NO_IMAGE"
    BLURRY_IMAGE = "BLURRY_IMAGE"
    LOW_RESOLUTION = "LOW_RESOLUTION"
    PHOTO_DATE_UNKNOWN = "PHOTO_DATE_UNKNOWN"
    PHOTO_PREDATES_COMPLAINT = "PHOTO_PREDATES_COMPLAINT"
    PRODUCT_MISMATCH = "PRODUCT_MISMATCH"
    CONFLICTING_PHOTOS = "CONFLICTING_PHOTOS"
    FUNCTION_NOT_VERIFIABLE = "FUNCTION_NOT_VERIFIABLE"
    PACKAGING_NOT_VISIBLE = "PACKAGING_NOT_VISIBLE"
    NO_VISIBLE_DAMAGE = "NO_VISIBLE_DAMAGE"
    CLAIM_UNCLASSIFIED = "CLAIM_UNCLASSIFIED"
    FIXTURE_LABEL_ONLY = "FIXTURE_LABEL_ONLY"
    AI_FALLBACK_USED = "AI_FALLBACK_USED"
    QUOTE_MISMATCH = "QUOTE_MISMATCH"
    UNSUPPORTED_ASSERTION_BLOCKED = "UNSUPPORTED_ASSERTION_BLOCKED"
    PROMPT_INJECTION_TEXT = "PROMPT_INJECTION_TEXT"
