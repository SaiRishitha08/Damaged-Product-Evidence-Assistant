# Person 1: Backend, Data and Contracts Lead. Plan for your AI assistant

## How to use this file
You are the AI coding assistant for Person 1. Read `plans/00_SHARED_CONTRACT.md` completely first, then this file. Work one task at a time. Do not start the next task until the Definition of Done (DoD) checks of the current one pass. Never invent data. Never edit directories you do not own. If the contract looks wrong, stop and tell the human to raise a contract change (contract section 12); do not quietly change it.

## Mission
Own the spine that connects everyone: the `contracts/` package, the FastAPI backend, the database, file storage, the review workflow, exports and deployment. If your API matches the contract, P2 and P3 integrate without surprises.

## You own
`contracts/`, `backend/`, `.env.example`, `requirements.txt`, deployment files.

## You must not touch
`analysis/` (P2), `frontend/` (P3), `fixtures/`, `tests/e2e`, `docs/` (P4). Ask the owner.

## You consume
- From P2: `analysis.analyze(req)` and `analysis.check_image(bytes)`, plus `analysis/rules/*.json` for `/api/rules`.
- From P4: `fixtures/fixture.json` for import; `expected_results.json` (only passed through to the eval runner).

## You provide
- To P2 and P3: `contracts/models.py`, `enums.py`, `examples/*.json`, `openapi.json`.
- To P3: a running API (stub mode first, real mode after G2).
- To P4: stable endpoints and error codes for integration tests.

## Tasks in order

### B1. Scaffold (G0, first hour)
Repo skeleton exactly as in contract section 2, `__init__.py` files, `requirements.txt` (fastapi, uvicorn[standard], pydantic, pydantic-settings, sqlalchemy>=2, python-multipart, pillow, numpy, google-genai, supabase, pytest, httpx), `.gitignore` (`.env`, `.env.*` except `.env.example`, `.venv`, `node_modules`, `dist`, `storage/`, `*.db`), `.env.example` from contract section 8.
DoD: `python -c "import contracts, backend, analysis"` works from the root (create empty `analysis/__init__.py` with the stub if P2 has not pushed).

### B2. Contracts package (G0)
Write `contracts/enums.py` and `contracts/models.py` as Pydantic v2 exactly per sections 3-4 (literal `requires_human_review: Literal[True]`). Write all `contracts/examples/*.json` listed in section 10; DAMAGE01 and DAMAGE10 examples must obey the rules (claim quote exact, metadata not observation, no refund wording). Add `scripts`-free command `python -m backend.export_openapi` that writes `contracts/openapi.json`. Add `contracts/CHANGELOG.md` with `v1`.
DoD: every example validates against its model in a unit test (`tests/unit/test_contract_examples.py`); tag `contract-v1` after all four approve.

### B3. API skeleton + stub mode (G0)
`backend/app/main.py`, CORS from `FRONTEND_ORIGIN`, uniform error handler producing the contract error format, `X-Reviewer` dependency (`deps.get_reviewer`, 401 if missing; abstraction so Supabase JWT can replace it later), `/health`, `/api/config`, `/api/rules` (reads P2's JSON, falls back to `examples/rules.json`). With `STUB_MODE=1` all other routes return canned examples with correct shapes.
DoD: P3 can open `/docs` and fetch every route; H1 passes (frontend `gen:types` compiles). Tell the human to notify P3.

### B4. Database (G1)
SQLAlchemy 2 models for the 7 tables, portable `Uuid` and `JSON` types, `create_all` on startup, session dependency, thin repository functions. Timestamps UTC. `findings.original_text` is write-once.
DoD: unit test creates, reads and updates each table on SQLite.

### B5. Storage (G1)
`StorageBackend` interface (`put(path, bytes, mime)`, `get(path)`, `delete(path)`), `LocalStorage` implementation, `SupabaseStorage` implementation (private bucket, secret key only on backend). Choose by `STORAGE_BACKEND`. Path convention `{case_id}/{evidence_id}.{ext}`.
DoD: tests for LocalStorage; Supabase implementation unit-tested with a mocked client.

### B6. Cases and fixture import (G1)
`POST/GET /api/cases`, `GET /api/cases/{id}` (CaseDetail; set `first_opened_at` once), `POST /api/fixtures/import`: read `fixtures/fixture.json`, map `images[]` by product id taken from the filename (`P01.png` -> P01), create 10 cases `DAMAGE01..10` with `source_mode=fixture`, `product_title` from `metadata_title`, one `fixture_reference` Evidence row when `image` is not null with `fixture_path` and `fixture_visible_description`; DAMAGE10 gets no Evidence. Idempotent by `case_code`. Never set a fake `storage_path`.
DoD: import twice gives `imported=10` then `skipped=10`; empty `complaint_text` gives 422 `field:"complaint_text"`.

### B7. Evidence upload (G3)
Multipart upload: allow jpg/png/webp, max 8 MB, open with Pillow to prove it is an image (415/413 otherwise), compute sha256, reject duplicate hash within the case (409 `DUPLICATE_EVIDENCE`), call `analysis.check_image`, store bytes, save row with `quality_flags`. `GET /api/evidence/{id}/image` proxies bytes only for authorised callers.
DoD: tests for wrong type, oversized, corrupt file, duplicate.

### B8. Analysis endpoint (G2 for fixture path, G3 for live)
Build `AnalysisRequest` from the case: fixture evidence passes `fixture_visible_description` and `fixture_visible_fact` (the complaint's `visible_fact`, stored on the case at import in a `fixture_visible_fact` column or in the evidence row; pick one and document it), live evidence passes bytes loaded from storage. Create `analysis_runs` row `pending`, call `analyze` in `try/except`, on success save `result_json`, findings (assign UUIDs, keep `local_id`), evidence requests, set status `needs_review`; on exception save `failed`, keep the case, return 200 with the run status failed and a clear error in `validation_issues`. Refuse a second run while one is pending (409). Config flags `uncertainty_flags_enabled` -> `options.flags_enabled`. Replace previous provisional findings from an earlier run but keep reviewer-edited ones flagged (do not silently delete reviewed work; keep earlier runs in history).
DoD: H2 passes with P2's stub then real engine; failed analyzer does not corrupt the case.

### B9. Findings edit and evidence requests (G4)
`PATCH findings`: change `text` -> `review_status=edited`, keep `original_text`, write audit event with previous/new value, run P2's validator on the new text and return non-blocking `warnings`. `POST evidence-requests` with audit event.
DoD: edit survives reopening the case; audit row exists.

### B10. Review endpoint (G4)
Implement contract section 6 exactly, including idempotency, status transitions and `UNREVIEWED_FINDINGS` (list finding ids). Transaction: decision row + status change + audit commit together or not at all.
DoD: unit tests for each of the 7 rules, including repeat of an already confirmed action.

### B11. Export, metrics, evaluation (G4)
Export JSON = CaseDetail + `generated_at` + `provisional` + disclosure footer; CSV columns `case_code,item_type,kind,text,source_type,uncertainty,review_status,evidence_ref,created_at` (nulls empty, never 0). Provisional exports include a first line/field `PROVISIONAL - NOT REVIEWED`. Metrics per contract (null when no data; median handling = decision time minus `first_opened_at`, disclose that it is wall-clock). `POST /api/evaluation/run` calls `evaluation.run_eval.run()` and returns its report.
DoD: CSV opens in a spreadsheet with correct columns; metrics return nulls on an empty database.

### B12. Hardening (G5)
Timeouts, upload limits, no secrets in logs, CORS restricted, `X-Reviewer` required everywhere, rate limit on analysis (simple in-memory), consistent error codes for every failure path in contract section 5.
DoD: a test per error code.

### B13. Deploy (G6, optional)
Dockerfile or Procfile for FastAPI, Supabase Postgres `DATABASE_URL`, Supabase bucket private, env vars set on the host, `docs` input for P4's deployment notes. Stretch: replace `X-Reviewer` with Supabase JWT verification inside `deps.get_reviewer` only.
DoD: deployed `/health` OK, upload private, key absent from Git history.

## Self-checks before every PR
- Does every response match `contracts/openapi.json`?
- Did I keep claims, observations, metadata and unknowns apart?
- Any `0` where unknown should be `null`?
- Any refund/approve value anywhere?
- Did I add a test?

## Hand-off notes to leave
After B3, B8 and B10, post a short message: what changed, which handshake now passes, which endpoint P3 can start using.
