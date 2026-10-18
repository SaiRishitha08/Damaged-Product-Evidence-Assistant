# Person 3: Frontend. Plan for your AI assistant

## How to use this file
You are the AI coding assistant for Person 3. Read `plans/00_SHARED_CONTRACT.md` completely first, then this file. Work one task at a time and finish its Definition of Done (DoD) before the next. Never invent API fields. Never edit directories you do not own. If the API or data shape looks wrong, tell the human to raise a contract change; do not work around it with private assumptions.

## Mission
Build the reviewer's workspace so the evidence distinction is impossible to miss: claims, observations, metadata, unknowns and missing evidence in separate, labelled sections, a visible uncertainty and provisional state, and a decision panel that only a named reviewer can use. The interface must be honest about fixture labels versus real photos.

## You own
`frontend/` only.

## You must not touch
`contracts/`, `backend/`, `analysis/`, `fixtures/`, `docs/`. Generated types come from the contract; you never hand-edit them.

## You consume
- From P1: running API (start with `STUB_MODE=1`), `contracts/openapi.json`, `contracts/examples/*.json`.
- From P2 indirectly: flag labels and explanations arrive through `GET /api/rules`. Do not hard-code flag text.
- From the contract: UI test IDs (section 9).

## You provide
- To P4: stable `data-testid` attributes exactly as in contract section 9.
- To the team: a demo-ready UI, and one `frontend/README.md` with run/build commands.

## Screens (4, merged from the original six to cut integration risk)
1. **Cases** (dashboard): summary tiles, search, status filter, case table, Import fixture button, New case button.
2. **New case**: complaint text, product id/title, file input with previews and client-side validation (type, size), mode (fixture/live) clearly stated.
3. **Case workspace** (the main screen, tabs or stacked sections): evidence viewer or explicit no-image state; Analyze button and run info (mode, model, prompt version, duration, cost or "unknown"); sections Customer claims, Visible observations, Metadata, Unknowns, Missing evidence, Flags; per-finding edit, accept, reject; review panel (rationale, request evidence, escalate, confirm); provisional/confirmed badge; audit timeline; export JSON/CSV.
4. **Metrics and evaluation**: tiles from `/api/metrics` (show "no data" for null, never 0), Run evaluation button, per-case pass/fail table with failures visible.

## Tasks in order

### F1. Scaffold (G0)
Vite + React + TypeScript + Tailwind + React Router. `.env` with `VITE_API_BASE_URL`. Script `npm run gen:types` using `openapi-typescript` against `../contracts/openapi.json` into `src/types/api.ts` (generated, committed). ESLint + `tsc --noEmit` as `npm run typecheck`.
DoD: app boots; typecheck passes (H1).

### F2. API client and shell (G0-G1)
`src/services/api.ts`: typed fetch wrapper, attaches `X-Reviewer`, parses the contract error format into a typed `ApiError {code, message, field}`. Reviewer-name entry screen stored in `sessionStorage` (disclosed as "demo sign-in, not secure authentication"). App shell with nav (`nav-*` ids) and `config-banner` built from `/api/config`: analyzer mode, fixture vs live, "All output is provisional until a reviewer confirms", and a visible notice when fallback or fixture mode is active.
DoD: every error code shows a readable message; banner appears on every page.

### F3. Cases screen (G1)
List from `GET /api/cases`, search `q`, status filter, `case-row-{case_code}`, tiles computed from the list (total, needs review, needs more evidence, escalated, confirmed), `btn-import-fixture` calls the import and refreshes. Empty state explains how to import the fixture.
DoD: against stub: renders without errors (H3 part).

### F4. Case workspace, read-only (G1-G2)
Render `CaseDetail`. One component per section with the exact test IDs. Findings show kind badge, source type label (image / fixture label / metadata / customer text), uncertainty chip, review status, and for claims the quote in quotation marks. `no-image-state` when there is no `image_url`; for `fixture_reference` evidence show "Fixture reference, no image file" with the fixture description labelled as a label. Flags section lists flags with label and explanation from `/api/rules`, severity colour plus text (never colour alone). Provisional badge until confirmed.
DoD: all canned examples render (damage01, damage10, blurry live) with no console errors (H3).

### F5. Analyze action and live states (G2-G3)
`btn-analyze` -> `POST analysis`; show `analysis-status` (idle, running with disabled button, success, failed with retry). Failed run keeps the case visible. Show fallback disclosure when `mode` is not `gemini` in live mode. Prevent double clicks.
DoD: running state cannot create duplicate runs; failure message is readable.

### F6. New case with uploads (G3)
Create case then upload each file sequentially, with previews, per-file status and clear errors for 415, 413 and duplicate (409). Block submit when complaint is empty and show the field error from the API too.
DoD: wrong type, oversize and duplicate each give a specific message.

### F7. Review actions (G4)
Inline edit for any finding: `btn-edit-*`, `input-edit-*`, `btn-save-*`, accept and reject buttons; show returned `warnings` non-blockingly. Review panel: `input-rationale` required, `btn-request-evidence`, `btn-escalate`, `btn-confirm`. When `reviewer_confirmation_required` and findings are still provisional, show the API's `UNREVIEWED_FINDINGS` list (highlight those findings) rather than failing silently. Repeat action shows "already recorded" using `duplicate:true`. Disable decisions after `confirmed`. Add missing-evidence request form.
DoD: edits persist after reload; review errors appear in `review-error`, success in `review-result`.

### F8. Export and audit (G4)
Export buttons download via the API; provisional exports are labelled in the UI before download. Audit timeline lists edits and decisions with actor and time.
DoD: JSON and CSV download and open.

### F9. Metrics and evaluation screen (G5)
Tiles `metric-{name}`, null shown as "no data". `btn-run-eval` calls the API, `eval-summary` shows counts and a table with failures (never hide failures). Footer shows disclosures from `/api/metrics`.
DoD: renders against stub and real API.

### F10. Polish and accessibility (G5)
Keyboard operable controls, labels on inputs, alt text on images, readable contrast, responsive at laptop and phone width, no layout jump during loading. Loading and error states everywhere. Remove console warnings.
DoD: manual checklist in `frontend/README.md` ticked; Lighthouse accessibility reviewed if time allows.

### F11. Build and deploy (G6, optional)
`npm run build`, Vercel or similar, set `VITE_API_BASE_URL`. No secrets in the bundle.
DoD: deployed site reaches the backend; no key in `dist/`.

## Rules for your assistant
- Never show a fixture label as a photo. Never show the word "approved", "refund" as an action, or any verdict.
- Do not hard-code flag text; read `/api/rules`.
- Treat `null` as "unknown" in the UI.
- Do not store case data in `localStorage` (only the reviewer name in `sessionStorage`).
- Keep component names and `data-testid`s exactly as the contract.

## Self-checks before every PR
- `npm run typecheck` and `npm run build` pass.
- Does it work with `STUB_MODE=1` and the real API?
- Did I add or keep the right test IDs?

## Hand-off notes to leave
After F4, F7 and F9 post a short message: which screens work against the real API, known gaps.
