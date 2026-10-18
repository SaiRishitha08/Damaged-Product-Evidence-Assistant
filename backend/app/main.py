import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.config import get_settings
from contracts.enums import AnalyzerMode
from contracts.models import ConfigResponse, HealthResponse

from backend.app.cases import evidence_router, fixtures_router, router as cases_router
from backend.app.metrics import router as metrics_router
from backend.db import initialize_database

settings = get_settings()
app = FastAPI(title="Damaged Product Evidence Assistant", version=settings.app_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(cases_router)
app.include_router(fixtures_router)
app.include_router(evidence_router)
app.include_router(metrics_router)


def error_response(code: str, message: str, field: str | None = None, status_code: int = 422) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "field": field}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    first_error = exc.errors()[0]
    location = first_error.get("loc", ())
    field = str(location[-1]) if location and location[-1] != "body" else None
    message = first_error.get("msg", "Request validation failed")
    return error_response("VALIDATION_ERROR", message, field, 422)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    code_by_status = {
        401: "UNAUTHORIZED",
        404: "NOT_FOUND",
        409: "INTERNAL",
        413: "FILE_TOO_LARGE",
        415: "UNSUPPORTED_FILE",
    }
    detail = exc.detail
    if isinstance(detail, dict):
        return error_response(
            detail.get("code", code_by_status.get(exc.status_code, "INTERNAL")),
            detail.get("message", "Request failed"),
            detail.get("field"),
            exc.status_code,
        )
    message = str(detail)
    code = code_by_status.get(exc.status_code, "INTERNAL")
    if exc.status_code == 409:
        code_by_message = {
            "Analysis is already in progress": "ANALYSIS_IN_PROGRESS",
            "Analysis is required": "ANALYSIS_REQUIRED",
            "Case is already confirmed": "CASE_ALREADY_CONFIRMED",
            "Unreviewed findings": "UNREVIEWED_FINDINGS",
            "Duplicate evidence": "DUPLICATE_EVIDENCE",
        }
        code = code_by_message.get(message, code)
    return error_response(code, message, None, exc.status_code)


@app.exception_handler(Exception)
async def internal_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return error_response("INTERNAL", "Internal server error", None, 500)


@app.on_event("startup")
def startup() -> None:
    initialize_database()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.get("/api/config", response_model=ConfigResponse)
def config() -> ConfigResponse:
    return ConfigResponse(
        reviewer_confirmation_required=settings.reviewer_confirmation_required,
        uncertainty_flags_enabled=settings.uncertainty_flags_enabled,
        analyzer_mode=AnalyzerMode(settings.analyzer_mode),
        gemini_configured=bool(settings.gemini_api_key),
        storage_backend=settings.storage_backend,
        db_backend="sqlite" if settings.database_url.startswith("sqlite") else "postgres",
        auth_mode=settings.auth_mode,
        app_version=settings.app_version,
        disclosures=[
            "Analysis is provisional until a named reviewer confirms it.",
            "No automatic refund, fraud or authenticity verdict is made.",
        ],
    )


@app.get("/api/rules")
def rules() -> dict[str, list[dict[str, str]] | list[str]]:
    rules_dir = Path(__file__).resolve().parents[2] / "analysis" / "rules"
    flags_path = rules_dir / "flags.json"
    claims_path = rules_dir / "claim_rules.json"
    flags = []
    claim_types = ["functional", "packaging", "other", "unclear"]
    if flags_path.exists():
        with flags_path.open(encoding="utf-8") as flags_file:
            flags = json.load(flags_file).get("flags", [])
    if claims_path.exists():
        with claims_path.open(encoding="utf-8") as claims_file:
            claim_types = sorted({item["claim_type"] for item in json.load(claims_file).get("claims", [])})
    return {
        "flags": flags,
        "claim_types": claim_types,
    }
