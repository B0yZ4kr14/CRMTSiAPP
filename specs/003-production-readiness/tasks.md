# Tasks: Production Readiness & User-Facing Gaps

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/management.md`, `quickstart.md`

## Phase 1 — Setup & CLI Foundation
- [x] T001 [P] Create unified CLI entry point at `bin/crm-cli.js` supporting admin management, worker inspection, and db verification.
- [x] T002 Implement Setup Wizard routes and onboarding state handling in `server.js` and `modules/setup/wizard.js`.

## Phase 2 — Real-Time SSE Layer
- [x] T003 Implement Server-Sent Events (SSE) broadcast hub in `modules/realtime/sse-hub.js` and `/events` route in `server.js`.
- [x] T004 Integrate real-time SSE push triggers into inbox message ingestion and SLA event workers.

## Phase 3 — AI Provider Management & Visual Editors
- [x] T005 Implement AI Token management settings workspace and secure secret binding in `modules/ai/token-routes.js`.
- [x] T006 Implement visual low-code node/flow builder UI for automations and campaigns in `modules/automation/visual-builder.js` and `modules/marketing/visual-campaign.js`.

## Phase 4 — Acceptance & Verification
- [x] T007 Run production-readiness regression and integration tests; update traceability evidence.
