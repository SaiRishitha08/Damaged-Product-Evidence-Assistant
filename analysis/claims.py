import re

from contracts.enums import ClaimType, FindingKind, SourceType, Uncertainty
from contracts.models import Finding

CLAIM_RULES: tuple[tuple[str, ClaimType], ...] = (
    ("item does not work", ClaimType.functional),
    ("package was damaged", ClaimType.packaging),
)

PROMPT_INJECTION_PATTERN = re.compile(
    r"\b(ignore|disregard|override)\b.*\b(rule|instruction|refund|approve)\b",
    re.IGNORECASE,
)


def extract_claims(complaint_text: str, flags_enabled: bool) -> tuple[list[Finding], bool]:
    findings: list[Finding] = []
    prompt_injection_detected = bool(PROMPT_INJECTION_PATTERN.search(complaint_text))
    uncertainty = Uncertainty.unknown if not flags_enabled else Uncertainty.moderate

    for phrase, claim_type in CLAIM_RULES:
        match = re.search(re.escape(phrase), complaint_text, re.IGNORECASE)
        if match is None:
            continue
        quote = complaint_text[match.start() : match.end()]
        findings.append(
            Finding(
                local_id=f"f{len(findings) + 1}",
                kind=FindingKind.claim,
                text=quote,
                original_text=quote,
                source_type=SourceType.customer_text,
                exact_quote=quote,
                claim_type=claim_type,
                uncertainty=uncertainty,
            )
        )

    return findings, prompt_injection_detected
