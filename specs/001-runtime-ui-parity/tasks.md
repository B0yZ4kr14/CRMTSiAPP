# Tasks: Runtime-aligned UI, navigation and documented parity

**Input**: `spec.md`, `plan.md`

## Phase 1 — Evidence and test harness

- [x] T001 Create authenticated primary/settings route-sweep regression test in `test/browser-route-sweep.test.js` using the server test harness or a bounded HTTP fixture.
- [x] T002 Create PostgreSQL-real settings schema/workflow regression in `test/postgres-settings-compatibility.test.js` that proves every selected settings query uses existing migrated columns.
- [x] T003 Add remote diagnosis script `scripts/diagnose-settings-vpstsiapp.sh` with private log and exit file.
- [x] T004 Record the authenticated browser result and remote diagnosis in `specs/001-runtime-ui-parity/research.md`.

## Phase 2 — US1: Reliable navigation (P1)

- [x] T010 [US1] Refactor `server.js:renderSettings` to load only section-required data and use the canonical relation/column names.
- [x] T011 [US1] Align `workspace.js:settingsNav` with the actual server allowlist; hide/defer routes with no real workflow rather than advertise them.
- [x] T012 [US1] Add route capability entries/authorization checks for each completed settings mutation in `route-capabilities.js`.
- [x] T013 [US1] Run RED/GREEN unit and PostgreSQL-real tests; run browser route sweep against local test runtime.

## Phase 3 — US2: Operational settings flows (P1)

- [x] T020 [US2] Introspect live `automation_rules`, `privacy_requests`, `audit_events` and channel-related tables through tmux; document canonical schema.
- [x] T021 [US2] Implement idempotent migration or source alignment for channels status, automation trigger/action, and privacy request type/status.
- [x] T022 [US2] Implement tenant-scoped automation create/list/audit workflow with input validation and route capability.
- [x] T023 [US2] Implement tenant-scoped privacy request create/list/audit workflow based on canonical `privacy_requests` schema.
- [x] T024 [US2] Implement queue/template management only after UI and schema data contract is verified; do not count read-only lists as completion.
- [x] T025 [US2] Add cross-tenant PostgreSQL-real tests covering each newly completed flow.

## Phase 4 — US3: Honest P0/P1 visibility and documentation (P2)

- [x] T030 [US3] Replace dashboard placeholder/fallback metrics with live tenant-scoped calculations only where required source data is real; otherwise label metrics unavailable.
- [x] T031 [US3] Mark IA, reports, campaigns, segments and other unbuilt modules honestly in parity matrix; do not present static screens as complete.
- [x] T032 [US3] Create `docs/CRMTSIAPP-UI-RUNTIME-AUDIT-2026-09-18.md` with route matrix, failure causes, fixed routes, remaining gaps and evidence handles.
- [x] T033 [US3] Reconcile contradictory completion claims in `task_plan.md`, `progress.md`, and runtime reconciliation documentation.


## Phase 5 — Review, deployment and independent validation

- [x] T040 Run `npm test`, relevant PostgreSQL-real tests, `git diff --check`, and static secret/dependency checks.
- [x] T041 Request independent code review of changed source/tests/docs; resolve blocking findings.
- [x] T042 Deploy through `tsi-crm-ui-parity-deploy` with backup, private log and exit file.
- [x] T043 Validate through independent `tsi-crm-ui-parity-validate` including service status, health, migrated schema and authenticated browser route sweep.
- [x] T044 Update this task list, project Kanban (`task_plan.md`) and progress documentation only with observed results.

## Phase 6 — US4: Core Functional Modules (Segments, Campaigns, IA, Reports)

- [ ] T050 [US4] Define canonical PostgreSQL schema for `segments`, `campaigns`, and `knowledge_articles` with tenant scoping and foreign keys.
- [ ] T051 [US4] Implement tenant-scoped CRUD and listing for `segments` with filter-rule persistence.
- [ ] T052 [US4] Implement `campaigns` lifecycle (draft -> scheduled -> running) and outbox integration for template dispatch.
- [ ] T053 [US4] Implement tenant-scoped `knowledge_articles` CRUD and keyword-search retrieval.
- [ ] T054 [US4] Implement `reports` dashboard calculations for key operational KPIs (message volume, conversation resolution, queue performance).
- [ ] T055 [US4] Run comprehensive PostgreSQL-real regression tests across all new modules.

