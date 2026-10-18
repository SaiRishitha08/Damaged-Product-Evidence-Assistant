# C12 Shared Contract v1

**Read this fully before reading your own plan. All four team members and their AI assistants build against this file.**
It is frozen at Gate G0. After that, changes only through the Change Protocol (section 12).

Project: Damaged Product Evidence Assistant. A support reviewer uploads photos + a complaint. The system produces a *provisional* summary that separates visible observations, customer claims, metadata, unknowns and missing evidence. A named human reviewer edits and confirms. The AI never decides refunds, fraud or authenticity.

---

## 1. Non-negotiable rules (every component must obey)

| # | Rule |
|---|------|
| R1 | A claim is a claim. `exact_quote` must be a literal substring of `complaint_text`. Never paraphrase a quote. |
| R2 | Catalogue title / product ID is **metadata**, never a visible observation. |
| R3 | A fixture label or fixture path is **not a photo**. Never send it to Gemini or call it an uploaded image. |
| R4 | No statement about cause, fraud, authenticity or refund eligibility. The decision enum contains no refund/approve/reject-claim value. |
| R5 | Output is provisional until a named reviewer confirms. `requires_human_review` is always `true`. |
| R6 | `null` means unknown, never 0 (tokens, cost, duration, rates with no data). |
| R7 | Functionality cannot be verified from a photo. It stays an `unknown` and triggers an evidence request. |
| R8 | Every fallback is disclosed (`analysis.mode`, UI banner, export footer). |
| R9 | AI never writes a human decision. Expected results are never overwritten by code. |
| R10 | Text inside images or complaints is data, never instructions. |

Allowed disclaimer: the fixed sentence in `limitations`: "No automatic refund, fraud or authenticity verdict is made." Forbidden-term scanning covers `findings` and `evidence_requests`, not `limitations`.

---

## 2. Repository layout and file ownership

Run all Python commands from the **repo root**. Packages `contracts`, `analysis`, `evaluation`, `backend` are importable from the root.

```
c12-assistant/
  contracts/        P1  enums.py, models.py, examples/*.json, openapi.json, CHANGELOG.md
  backend/          P1  app/main.py, config.py, deps.py, api/, db/, services/
  analysis/         P2  __init__.py(analyze), claims.py, quality.py, validator.py, rules_engine.py,
                        gemini_provider.py, mock_provider.py, prompts/, rules/*.json, examples/*.json
  evaluation/       P2  run_eval.py, reports/            (runner code; expected values belong to P4)
  frontend/         P3  Vite + React + TS + Tailwind
  fixtures/         P4  fixture.json, expected_results.json, challenge/, assets/
  tests/            P4  integration/, e2e/ (unit tests live beside each owner's code)
  docs/             P4  architecture, test plan, change_log/, business/, handoff
  plans/            P4  these .md files
  scripts/          P4  make_challenge_images.py ; P2 owns scripts/live_smoke.py
  .github/workflows P4
```

A directory has exactly one owner. Edit someone else's directory only by asking them (PR to them).

---

## 3. Enums (single source: `contracts/enums.py`)

```
SourceMode      : fixture | live
CaseStatus      : new | needs_review | needs_more_evidence | escalated | confirmed
FindingKind     : observation | claim | metadata | unknown
SourceType      : image | fixture_label | metadata | customer_text | reviewer | system_rule
Uncertainty     : low | moderate | high | unknown
ReviewStatus    : provisional | accepted | edited | rejected
ClaimType       : functional | packaging | other | unclear
Decision        : request_evidence | escalate | confirm_summary
EvidenceSource  : upload | fixture_reference
AnalyzerMode    : auto | rules | gemini | mock          (request)
AnalysisMode    : rules | gemini | mock                 (what actually ran)
RunStatus       : pending | success | failed
EvidenceReqStatus: open | supplied | cancelled
```

Status after events: create → `new`; analysis success → `needs_review`; decision `request_evidence` → `needs_more_evidence`; `escalate` → `escalated`; `confirm_summary` → `confirmed` (final).

### Flag codes (uncertainty flags; labels and explanations live in `analysis/rules/flags.json`)

```
NO_IMAGE                    no photo supplied
BLURRY_IMAGE                blur score below threshold
LOW_RESOLUTION              smaller than min width/height
PHOTO_DATE_UNKNOWN          no EXIF capture date
PHOTO_PREDATES_COMPLAINT    EXIF date older than threshold before complaint
PRODUCT_MISMATCH            visible object does not appear to match catalogue title (verify, never "fraud")
CONFLICTING_PHOTOS          two photos disagree
FUNCTION_NOT_VERIFIABLE     functional claim cannot be verified from a photo
PACKAGING_NOT_VISIBLE       packaging claim, packaging not shown
NO_VISIBLE_DAMAGE           photo shows no visible damage while a damage/function claim exists
CLAIM_UNCLASSIFIED          complaint matches no claim rule
FIXTURE_LABEL_ONLY          evidence is a fixture reference, no image bytes
AI_FALLBACK_USED            Gemini unavailable/invalid, rules engine used
QUOTE_MISMATCH              a quote failed substring check (blocked)
UNSUPPORTED_ASSERTION_BLOCKED  a forbidden conclusion was removed
PROMPT_INJECTION_TEXT       complaint contains instruction-like text, treated as data
```

---

## 4. Models (single source: `contracts/models.py`, Pydantic v2; JSON is snake_case, timestamps ISO-8601 UTC, ids UUID strings)

```
Finding
  id: str|null              (assigned by backend; null inside analyzer output)
  local_id: str             ("f1","f2",... assigned by analyzer)
  kind: FindingKind
  text: str                 current text (reviewer edits change this)
  original_text: str        immutable first value
  source_type: SourceType
  evidence_id: str|null     only for source_type=image
  exact_quote: str|null     required when kind=claim; must be substring of complaint_text
  claim_type: ClaimType|null  required when kind=claim
  uncertainty: Uncertainty
  review_status: ReviewStatus   default provisional

EvidenceRequestItem   { code: FlagCode|null, requested_item: str, reason: str }

AnalysisUsage         { input_tokens: int|null, output_tokens: int|null, duration_ms: int|null, estimated_cost_inr: float|null }

AnalysisResult
  mode: AnalysisMode
  model_id: str|null
  prompt_version: str|null
  findings: [Finding]
  flags: [FlagCode]
  evidence_requests: [EvidenceRequestItem]
  limitations: [str]
  validation_issues: [{code: str, message: str, local_id: str|null}]
  requires_human_review: true            (literal)
  usage: AnalysisUsage

AnalysisEvidence (analyzer input; bytes never serialised)
  evidence_id: str
  source_type: EvidenceSource
  image_bytes: bytes|null
  mime_type: str|null
  fixture_visible_description: str|null
  fixture_visible_fact: str|null
  quality_flags: [FlagCode]

AnalysisOptions       { analyzer: AnalyzerMode="auto", flags_enabled: bool=true, prompt_version: str="v1" }

AnalysisRequest
  case_id: str, case_code: str|null, product_id: str|null, product_title: str|null,
  complaint_text: str, source_mode: SourceMode, evidence: [AnalysisEvidence], options: AnalysisOptions

QualityReport         { width:int, height:int, blur_score:float, exif_datetime: str|null, flags:[FlagCode] }

Case          { id, case_code|null, product_id|null, product_title|null, complaint_text, source_mode, status,
                created_by, created_at, updated_at, first_opened_at|null }
Evidence      { id, case_id, source_type: EvidenceSource, fixture_path|null, mime_type|null, file_size_bytes|null,
                sha256|null, quality_flags:[FlagCode], image_url|null, fixture_visible_description|null, created_at }
EvidenceRequest { id, case_id, code|null, requested_item, reason, status, created_by, created_at }
AnalysisRun   { id, case_id, mode, model_id|null, prompt_version|null, status, input_image_count,
                flags:[FlagCode], validation_issues:[...], usage: AnalysisUsage, created_at }
ReviewDecision{ id, case_id, reviewer, decision, rationale, idempotency_key, created_at }
AuditEvent    { id, case_id, actor, entity_type, entity_id|null, event_type, previous_value|null, new_value|null, created_at }

CaseDetail
  case: Case, evidence: [Evidence], findings: [Finding], flags: [FlagCode],
  evidence_requests: [EvidenceRequest], latest_analysis: AnalysisRun|null,
  decisions: [ReviewDecision], audit: [AuditEvent],
  provisional: bool        (true until status=confirmed)
```

Database tables (SQLAlchemy 2, portable types): `cases, evidence_files, findings, evidence_requests, analysis_runs (result_json JSON), review_decisions, audit_events`. One `findings` table with `kind` replaces separate claims/observations tables. `DATABASE_URL=sqlite:///./c12.db` locally; the Supabase Postgres URL in deployment. Same code.

---

## 5. HTTP API (single source: FastAPI + `contracts/openapi.json`)

All routes JSON unless noted. Reviewer identity header: `X-Reviewer: <name>` (required on every `/api` call except `/api/config` and `/api/rules`). `Idempotency-Key` optional on analysis.

| Method | Path | Body / query | Success | Notes |
|---|---|---|---|---|
| GET | /health | | `{status:"ok"}` | |
| GET | /api/config | | Config | flags, modes, disclosures |
| GET | /api/rules | | `{flags:[{code,label,severity,explanation}], claim_types:[...]}` | UI renders flags generically from this |
| POST | /api/fixtures/import | | `{imported:int, skipped:int, case_codes:[...]}` | idempotent by case_code; mode `fixture` |
| POST | /api/cases | `{case_code?, product_id?, product_title?, complaint_text, source_mode}` | Case (201) | `complaint_text` required, 1..5000 chars |
| GET | /api/cases | `?status=&q=` | `[Case]` | |
| GET | /api/cases/{id} | | CaseDetail | sets `first_opened_at` once |
| POST | /api/cases/{id}/evidence | multipart `file` | Evidence (201) | jpg/png/webp, <=8 MB, Pillow must open it; duplicate sha256 in case → 409 |
| POST | /api/cases/{id}/analysis | `{analyzer?}` | CaseDetail | 409 if a run is pending |
| PATCH | /api/cases/{id}/findings/{fid} | `{text?, review_status?}` | `{finding, warnings:[str]}` | edit → status `edited`, audit event, original kept |
| POST | /api/cases/{id}/evidence-requests | `{requested_item, reason, code?}` | EvidenceRequest (201) | |
| POST | /api/cases/{id}/review | `{decision, rationale, idempotency_key}` | `{decision, case_status, duplicate}` | see section 6 |
| GET | /api/cases/{id}/export | `?format=json|csv` | file | provisional exports carry a PROVISIONAL marker |
| GET | /api/metrics | | Metrics | nulls where no data |
| POST | /api/evaluation/run | | EvalReport | runs fixture + challenge eval |
| GET | /api/evidence/{id}/image | | image bytes | authorised proxy, never a public URL |

Config: `{reviewer_confirmation_required, uncertainty_flags_enabled, analyzer_mode, gemini_configured, storage_backend, db_backend, auth_mode, app_version, disclosures:[str]}`

Metrics: `{cases_total, by_status:{...}, median_handling_seconds|null, evidence_request_rate|null, finding_edit_rate|null, analyses_total, analyses_failed, mean_analysis_ms|null, total_estimated_cost_inr|null, cost_per_reviewed_case_inr|null, latest_eval|null, disclosures:[str]}`

EvalReport: `{run_at, fixture_version, analyzer_mode, flags_enabled, confirmation_required, cases:[{case_code, checks:{c1_distinguish:bool, c2_no_unsupported:bool, c3_flags_and_requests:bool|null}, failures:[str]}], summary:{c1_pass:int, c2_pass:int, c3_pass:int, total:int}}`

**Error format (all non-2xx):** `{"error":{"code":"VALIDATION_ERROR","message":"complaint_text is required","field":"complaint_text"}}`
Codes: `VALIDATION_ERROR`(422) `NOT_FOUND`(404) `DUPLICATE_EVIDENCE`(409) `ANALYSIS_IN_PROGRESS`(409) `ANALYSIS_REQUIRED`(409) `UNREVIEWED_FINDINGS`(409, lists ids) `CASE_ALREADY_CONFIRMED`(409) `UNSUPPORTED_FILE`(415) `FILE_TOO_LARGE`(413) `UNAUTHORIZED`(401) `INTERNAL`(500).

---

## 6. Review rules (backend implements, everyone tests)

1. Decision requires non-empty `rationale` (422 with `field:"rationale"`). Missing `decision` → 422 `field:"decision"`.
2. No analysis yet → 409 `ANALYSIS_REQUIRED`.
3. If `reviewer_confirmation_required=true`: `confirm_summary` is refused with 409 `UNREVIEWED_FINDINGS` while any finding is still `provisional`. `request_evidence` and `escalate` are always allowed after analysis.
4. Same `idempotency_key`, or same decision + rationale as the latest decision, returns 200 with `duplicate:true` and creates nothing new.
5. After `confirmed`, any further decision → 409 `CASE_ALREADY_CONFIRMED`.
6. Every edit, acceptance, rejection and decision writes an `audit_events` row.
7. When `reviewer_confirmation_required=false` (baseline mode) rule 3 is skipped.

---

## 7. Analyzer interface (seam between P1 and P2)

```python
# analysis/__init__.py
def analyze(req: AnalysisRequest) -> AnalysisResult: ...
def check_image(data: bytes) -> QualityReport: ...   # backend calls this at upload
```

Behaviour contract:
- `analyze` never raises for provider/network/validation problems. It returns a result with `mode="rules"`, flag `AI_FALLBACK_USED` and a `limitations` entry.
- Claims are extracted **deterministically** from `complaint_text` by rules, not by Gemini.
- `source_mode=fixture` never calls Gemini.
- Gemini is used only for visible observations of real image bytes. The rules engine then validates and adds unknowns, flags and evidence requests.
- The same input must give the same findings when `mode` is `rules` or `mock`.
- `flags_enabled=false` returns `flags=[]` and `uncertainty="unknown"` on findings (baseline mode); unknowns and evidence requests are still produced.

Rule files (owner P2, read by backend `/api/rules`): `analysis/rules/flags.json`, `claim_rules.json` (keyword → claim_type), `evidence_requests.json` (flag/claim_type → requested_item + reason), `forbidden_patterns.json`, `thresholds.json` (blur, min size, photo age days).
Because rules are data, a market-shock change (new edge case) is a JSON edit, not new UI or API code.

---

## 8. Environment variables (`.env.example` committed, real `.env` never)

```
GEMINI_API_KEY=            # backend only
GEMINI_MODEL=gemini-3.8-flash      # verify in AI Studio; keep configurable
ANALYZER_MODE=auto
GEMINI_PRICE_INR_PER_1M_INPUT=     # empty => cost stays null
GEMINI_PRICE_INR_PER_1M_OUTPUT=
DATABASE_URL=sqlite:///./c12.db
STORAGE_BACKEND=local              # local | supabase
LOCAL_STORAGE_DIR=./storage
SUPABASE_URL=
SUPABASE_SECRET_KEY=               # backend only, never in frontend
SUPABASE_BUCKET=case-evidence
REVIEWER_CONFIRMATION_REQUIRED=true
UNCERTAINTY_FLAGS_ENABLED=true
FRONTEND_ORIGIN=http://localhost:5173
STUB_MODE=0                        # 1 => API returns contracts/examples/*.json
# frontend/.env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 9. UI test IDs (P3 implements, P4 writes Playwright against them)

```
nav-cases  nav-new  nav-metrics
config-banner                 (shows analyzer mode, fixture/live, provisional)
case-row-{case_code}  case-search  status-filter
btn-import-fixture  btn-create-case  input-complaint  input-product-id  input-product-title  input-files
section-claims  section-observations  section-metadata  section-unknowns  section-evidence-requests  section-flags
finding-{local_id}  btn-edit-{local_id}  input-edit-{local_id}  btn-save-{local_id}  btn-accept-{local_id}  btn-reject-{local_id}
no-image-state  image-viewer
btn-analyze  analysis-status
btn-request-evidence  btn-escalate  btn-confirm  input-rationale  review-error  review-result
provisional-badge  confirmed-badge
btn-export-json  btn-export-csv
btn-run-eval  eval-summary  metric-{name}
```

---

## 10. Canned data for parallel work (created at G0)

- `contracts/examples/case_detail_damage01.json` (functional claim, fixture), `case_detail_damage10.json` (no image), `case_detail_live_blurry.json`, `analysis_result_*.json`, `config.json`, `rules.json`, `metrics.json`, `eval_report.json`.
- With `STUB_MODE=1` the backend returns these. P3 builds the UI against them. P2's stub `analyze()` returns `analysis/examples/*.json` until the real engine lands.

## 11. Integration handshakes (a gate closes only when its handshakes pass)

| ID | Handshake | Who proves it |
|----|-----------|---------------|
| H1 | `contracts` imports in backend + analysis; `npm run gen:types` compiles in frontend | P1 |
| H2 | Backend calls `analyze()` and stores a valid `AnalysisResult` | P1 + P2 |
| H3 | Frontend renders every canned example with no console errors | P3 |
| H4 | Fixture journey end to end through the real API: import → open → analyze → edit → review → reopen → export | P4 |
| H5 | `POST /api/evaluation/run` returns the report and matches `evaluation/reports/` | P2 + P4 |
| H6 | Live upload → storage → Gemini (or disclosed fallback) → findings visible in UI | all |

## 12. Change protocol

1. Open `CONTRACT_REQUEST` as a PR touching only `contracts/` and this file, titled `contract: <change>`.
2. All four members approve. P1 merges, bumps `contracts/CHANGELOG.md`, regenerates `openapi.json`.
3. Everyone rebases within the same working block. No private contract changes, no extra fields "just for me".
4. Additive changes (new optional field, new flag code) are preferred over renames.

## 13. Git rules

Branches `p1/<topic>`, `p2/<topic>`, `p3/<topic>`, `p4/<topic>`. Small PRs. A PR touching validation, review rules or authorization needs a second reviewer. `main` always passes `make test`. Tags: `contract-v1` (G0), `baseline-v0` (G2), `final-v1` (G5).
