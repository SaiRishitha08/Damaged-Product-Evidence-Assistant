from contracts.enums import (
    AnalysisMode,
    ClaimType,
    FindingKind,
    FlagCode,
    SourceType,
    Uncertainty,
)
from contracts.models import AnalysisRequest, AnalysisResult, EvidenceRequestItem, Finding

from .claims import extract_claims

LIMITATION = "No automatic refund, fraud or authenticity verdict is made."


def analyze_with_rules(request: AnalysisRequest) -> AnalysisResult:
    flags: list[FlagCode] = []
    findings, prompt_injection_detected = extract_claims(
        request.complaint_text,
        request.options.flags_enabled,
    )
    uncertainty = Uncertainty.moderate if request.options.flags_enabled else Uncertainty.unknown
    evidence_requests: list[EvidenceRequestItem] = []
    next_local_id = len(findings) + 1

    if prompt_injection_detected and request.options.flags_enabled:
        flags.append(FlagCode.PROMPT_INJECTION_TEXT)

    if request.product_id or request.product_title:
        metadata = request.product_title or request.product_id
        findings.append(
            Finding(
                local_id=f"f{next_local_id}",
                kind=FindingKind.metadata,
                text=metadata,
                original_text=metadata,
                source_type=SourceType.metadata,
                uncertainty=uncertainty,
            )
        )
        next_local_id += 1

    if not request.evidence:
        flags.append(FlagCode.NO_IMAGE)
        flags.append(FlagCode.FUNCTION_NOT_VERIFIABLE)
        findings.append(
            Finding(
                local_id=f"f{next_local_id}",
                kind=FindingKind.unknown,
                text="Functionality cannot be verified without image or demonstration evidence.",
                original_text="Functionality cannot be verified without image or demonstration evidence.",
                source_type=SourceType.system_rule,
                uncertainty=uncertainty,
            )
        )
        evidence_requests.append(
            EvidenceRequestItem(
                code=FlagCode.FUNCTION_NOT_VERIFIABLE,
                requested_item="A short demonstration video or other functional evidence.",
                reason="A photo cannot verify whether the item works.",
            )
        )
    else:
        for evidence in request.evidence:
            if evidence.source_type == "fixture_reference":
                if FlagCode.FIXTURE_LABEL_ONLY not in flags:
                    flags.append(FlagCode.FIXTURE_LABEL_ONLY)
                if evidence.fixture_visible_description:
                    findings.append(
                        Finding(
                            local_id=f"f{next_local_id}",
                            kind=FindingKind.observation,
                            text=evidence.fixture_visible_description,
                            original_text=evidence.fixture_visible_description,
                            source_type=SourceType.fixture_label,
                            uncertainty=uncertainty,
                        )
                    )
                    next_local_id += 1
                findings.append(
                    Finding(
                        local_id=f"f{next_local_id}",
                        kind=FindingKind.unknown,
                        text="Functionality cannot be verified from a photo.",
                        original_text="Functionality cannot be verified from a photo.",
                        source_type=SourceType.system_rule,
                        uncertainty=uncertainty,
                    )
                )
                flags.append(FlagCode.FUNCTION_NOT_VERIFIABLE)
                evidence_requests.append(
                    EvidenceRequestItem(
                        code=FlagCode.FUNCTION_NOT_VERIFIABLE,
                        requested_item="A short demonstration video or other functional evidence.",
                        reason="The fixture evidence is a label, not an image that can verify functionality.",
                    )
                )

    if not findings:
        flags.append(FlagCode.CLAIM_UNCLASSIFIED)

    if not request.options.flags_enabled:
        flags = []

    return AnalysisResult(
        mode=AnalysisMode.rules,
        findings=findings,
        flags=flags,
        evidence_requests=evidence_requests,
        limitations=[LIMITATION],
    )
