# Integration Board

| Gate | Handshake | Status | Owner | Evidence | Blocker |
|---|---|---|---|---|---|
| G0 | H1 | In progress | P1 | Contracts import; OpenAPI generation pending | Frontend scaffold pending |
| G1 | H2 | Passing for fixture rules | P1/P2 | Fixture analysis persists runs, findings, and evidence requests | Full CaseDetail consumers pending |
| G1 | H3 | Blocked | P3 | Frontend not scaffolded | P3 implementation pending |
| G2 | H4 | Partial | P1/P4 | Import, analyze, edit, reopen paths pass; export pending | Export and remaining review actions pending |
| G4 | H5 | Blocked | P2/P4 | Evaluation runner not connected | P2 evaluator pending |
| G3 | H6 | Partial | P1/P2/P3/P4 | Upload, private local storage, and image proxy pass | Gemini/fallback UI path pending |

## Current evidence

- The only fixture source is the root `fixture.json` supplied for this project.
- Fixture import is idempotent: 10 imported on first run and 10 skipped on the second.
- `DAMAGE10` has no evidence record.
- CaseDetail returns persisted evidence, findings, flags, evidence requests, latest analysis, decisions, audit events, and provisional state.
- Finding edits preserve `original_text` and create audit events.
- Review decisions enforce analysis-required, provisional confirmation gating, status transitions, and idempotency.

Update this board after each gate checkpoint and record exact failing commands for blockers.
