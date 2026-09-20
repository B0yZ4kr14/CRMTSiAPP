# Tasks: Complete UI Modules

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Mandatory. Every behavior follows observed RED → GREEN, PostgreSQL-real coverage where persistence/concurrency applies, and browser/runtime evidence where user-visible.

**Completion rule**: A checked task means its named artifact and verification exist. No story or parity row is complete from schema, route, static UI, hardcoded data, skipped tests, or documentation alone.

## Format

`[ID] [P?] [Story] Description with exact path`

- `[P]`: can proceed in parallel after its phase dependencies.
- `[USn]`: maps to the numbered user story in `spec.md`.

## Phase 1 — Setup and Fail-Closed Traceability

- [x] T001 Create the requirement-to-evidence manifest schema and initial row mapping in `specs/002-complete-ui-modules/traceability.json`, covering every FR, SC, and parity-matrix ID.
- [x] T002 Create the mandatory acceptance manifest in `test/acceptance-manifest.json` with suite IDs, commands, prerequisites, evidence paths, timeouts, and allowed external blockers.
- [x] T003 Implement RED tests for missing/skipped/empty/stale acceptance suites in `test/acceptance-gate.test.js`.
- [x] T004 Implement the fail-closed manifest runner in `scripts/acceptance-gate.mjs` and add `test:acceptance` to `package.json`.
- [x] T005 [P] Add release/evidence JSON schema fixtures in `test/fixtures/acceptance/` without credentials or personal data.
- [x] T006 [P] Add secret scan, dependency audit, lock integrity, syntax, diff, and Supabase-absence checks to `scripts/acceptance-gate.mjs`.
- [x] T007 [P] Create deterministic PostgreSQL test-database provisioning/cleanup helper in `test/helpers/postgres-test-database.js`; missing configuration MUST fail mandatory DB suites.
- [x] T008 [P] Create shared authenticated HTTP/browser fixture helpers in `test/helpers/authenticated-app.js` and `test/helpers/browser-fixture.js` using Chromium.
- [x] T009 [P] Create shared tenant/adversarial fixtures for two tenants with colliding natural identifiers in `test/fixtures/tenant-matrix.js`.
- [x] T010 Run the new gate RED suite, record observed failures in `specs/002-complete-ui-modules/research.md`, then make only the setup checks GREEN.

## Phase 2 — Shared Platform Foundation

- [x] T011 Add governed migration lock/checksum/version metadata RED tests for fresh, rerun, interrupted, and representative-upgrade paths in `test/postgres-migration-governance.test.js`.
- [x] T012 Implement migration lock/checksum governance and release compatibility metadata in `migrate.js` and `domain-schema.js`.
- [x] T013 Add tenant-qualified constraint/backfill conflict RED tests for every existing business table in `test/postgres-tenant-constraints.test.js`.
- [x] T014 Implement staged tenant backfills, conflict reporting, tenant-qualified unique keys, and foreign keys in `migrate.js` and `domain-schema.js`.
- [x] T015 Add operation-context and no-default-tenant RED tests in `test/operation-context.test.js`.
- [x] T016 Implement explicit `{tenantId, actor, authorization, correlationId}` propagation in `tenant-context.js`, `authorization.js`, `server.js`, workers, and new `modules/shared/operation-context.js`.
- [x] T017 Add append-only audit integrity and transactional audit/job intent RED tests in `test/postgres-audit-integrity.test.js`.
- [x] T018 Implement tenant-scoped append-only audit chaining/verification in `authorization.js`, `domain-schema.js`, and `modules/shared/audit-service.js`.
- [x] T019 Add shared job envelope, fenced lease, stale-token, retry, cancellation, dead-letter, recovery, and 100-way concurrency RED tests in `test/postgres-job-runtime.test.js`.
- [x] T020 Implement shared durable jobs in `modules/operations/job-store.js`, `modules/operations/job-runtime.js`, and `workers/shared-worker.js`, preserving outbox compatibility.
- [x] T021 Refactor `outbox.js` and `outbox-worker.js` behind shared lease/idempotency/reconciliation primitives without changing accepted delivery behavior.
- [x] T022 Add route-registry completeness and capability-derived navigation RED tests in `test/route-registry-completeness.test.js`.
- [x] T023 Expand scoped capability definitions in `rbac.js`, `authorization.js`, and `route-capabilities.js`; reject every unregistered authenticated mutation.
- [x] T024 Add common safe validation, keyset cursor, typed-filter, expected-version, and error-contract helpers in `modules/shared/validation.js`, `modules/shared/pagination.js`, and `modules/shared/http-errors.js` with tests in `test/shared-contracts.test.js`.
- [x] T025 Add common expiring artifact metadata/access service in `modules/operations/artifact-service.js` with RED/GREEN tests in `test/artifact-access.test.js`.
- [x] T026 Add worker heartbeat/release identity/drain schema and service in `domain-schema.js` and `modules/operations/worker-health.js` with tests in `test/worker-health.test.js`.
- [x] T027 Run all Phase 1–2 unit and PostgreSQL-real suites with zero skips; update `specs/002-complete-ui-modules/traceability.json` with current evidence.

## Phase 3 — US1: Every Advertised Workspace Is Executable (P1)

**Independent test**: Each role opens every visible route, performs the principal persisted action, reloads the result, and receives no placeholder or unexpected 4xx/5xx.

- [x] T028 [US1] Extend the route catalog fixture for every route in `contracts/http-workspaces.md` in `test/fixtures/workspace-route-catalog.js`.
- [x] T029 [US1] Write RED authenticated role/action sweep tests in `test/browser-complete-workspace-sweep.test.js` covering empty, ready, validation, conflict, queued, failed, disabled, and forbidden states.
- [x] T030 [US1] Refactor `workspace.js` navigation generation to derive entries from capability, tenant feature state, and provider state without weakening server authorization.
- [x] T031 [US1] Refactor route composition in `server.js` to delegate each workspace to bounded module route/render services and return the common error contract.
- [x] T032 [P] [US1] Implement reusable accessible form, table, cursor, status, error, disabled-feature, and queued-job components in `modules/shared/workspace-components.js`.
- [x] T033 [P] [US1] Add keyboard/focus/label/heading/contrast/responsive acceptance assertions to `test/browser-accessibility.test.js`.
- [x] T034 [US1] Remove or replace every placeholder, hardcoded metric, dead action, and route/documentation mismatch found by the sweep in `workspace.js` and corresponding `modules/*` workspaces.
- [x] T035 [US1] Make direct unauthorized route/action and cross-tenant object requests disclosure-safe in `server.js` and all module route handlers.
- [x] T036 [US1] Run the complete browser route/action sweep and record route-level evidence in `docs/CRMTSIAPP-UI-RUNTIME-AUDIT-2026-09-19.md`.

## Phase 4 — US7: Identity, Security, Privacy Foundation (P1)

**Independent test**: Admin MFA, granular roles/scopes, team lifecycle, privacy execution, retention, secret rotation, incidents, and audit integrity pass end to end.

- [x] T037 [US7] Write RED granular role/resource/action/team/object-scope matrix tests in `test/authorization-scope-matrix.test.js`.
- [x] T038 [US7] Migrate granular roles, capabilities, tenant memberships, assignments, teams/capacity/availability, and object scope in `domain-schema.js` and `migrate.js`.
- [x] T039 [US7] Implement scoped policy evaluation in `rbac.js`, `authorization.js`, and `modules/identity/authorization-service.js`.
- [x] T040 [US7] Implement user/team/role/capacity/availability lifecycle routes and workspace in `modules/identity/routes.js`, `modules/identity/service.js`, and `modules/identity/workspace.js`.
- [x] T041 [P] [US7] Write RED administrator MFA enrollment/challenge/recovery/revocation/session-assurance tests in `test/mfa-lifecycle.test.js` and `test/browser-mfa.test.js`.
- [x] T042 [US7] Implement MFA factors, one-time recovery codes, challenges, protected-action assurance, and session invalidation in `modules/identity/mfa-service.js`, `modules/identity/session-service.js`, and `domain-schema.js`.
- [x] T043 [P] [US7] Write RED OIDC issuer/state/nonce/PKCE/tenant mapping/claim-validation tests in `test/oidc-contract.test.js`.
- [x] T044 [US7] Implement safe OIDC contract and explicit disabled/SAML-tier state in `modules/identity/oidc-service.js`, `modules/identity/routes.js`, and `modules/identity/workspace.js`.
- [x] T045 [P] [US7] Write RED secret rotation, no-redisplay, DNS mixed-answer/rebinding, unsafe redirect, and credential-leak tests in `test/secret-provider-boundary.test.js`.
- [x] T046 [US7] Implement tenant-scoped secret versions/rotation and safe pinned transport in `channel-secrets.js`, `channel-adapter.js`, and `modules/shared/safe-provider-transport.js`.
- [x] T047 [P] [US7] Write RED durable tenant/account/network quota and uniform HTML/JSON security-header tests in `test/quota-security-headers.test.js`.
- [x] T048 [US7] Implement quota policies/usage and response hardening in `modules/security/quota-service.js`, `server.js`, and `domain-schema.js`.
- [x] T049 [US7] Write RED privacy access/export/anonymize/delete, legal-hold, retention dry-run/purge, partial-block, and artifact-expiry tests in `test/privacy-access.test.js` and `modules/security/privacy-service.js`.
- [x] T050 [US7] Implement privacy/retention/legal-hold state and jobs in `modules/governance/privacy-service.js`, `modules/governance/retention-service.js`, `workers/privacy-worker.js`, and `domain-schema.js`.
- [x] T051 [P] [US7] Write RED supplier/transfer and incident deadline/escalation tests in `test/governance-workflows.test.js`.
- [x] T052 [US7] Implement supplier, transfer, incident, escalation, and governance workspaces in `modules/governance/`, `workers/governance-worker.js`, and `domain-schema.js`.
- [x] T053 [US7] Run US7 PostgreSQL, browser, security, privacy, and audit-integrity acceptance; update traceability and parity evidence without marking unrelated rows complete.

## Phase 5 — US2: Reliable Messaging and Complete Inbox (P1)

**Independent test**: One tenant-scoped conversation exercises duplicate inbound, assignment/transfer, concurrent agents, text/template/media, retries/recovery, SLA, snooze, and close/reopen without duplicate effects.

- [x] T054 [US2] Write RED provider-fake tests for duplicate/reordered inbound/status, text/template/media, timeout, rate limit, malformed output, unknown outcome, and recovery in `test/messaging-provider-contract.test.js`.
- [x] T055 [US2] Extend `FakeAdapter`, `MetaAdapter`, and `WahaAdapter` in `channel-adapter.js` to satisfy the typed messaging contract and safe transport rules.
- [x] T056 [US2] Write RED PostgreSQL inbound/outbound 100-way idempotency, lease-expiry ambiguity, and correlation tests in `test/postgres-messaging-concurrency.test.js`.
- [x] T057 [US2] Implement durable webhook acknowledgement, normalized events, end-to-end correlation, reconciliation-required state, and idempotent status updates in `channel-webhook-service.js`, `webhook-processor.js`, `outbox.js`, and workers.
- [x] T058 [P] [US2] Write RED tenant-safe keyset conversation/message pagination and message full-text search tests in `test/postgres-inbox-search-pagination.test.js`.
- [x] T059 [US2] Implement tenant-leading indexes, keyset queries, and PostgreSQL full-text search in `domain-schema.js` and `modules/inbox/store.js`.
- [x] T060 [P] [US2] Write RED attachment validation/scan/expiry/access/outbound tests in `test/attachment-workflow.test.js`.
- [x] T061 [US2] Implement attachment metadata, bounded upload, scan disposition, controlled download, retention, and media enqueue in `modules/inbox/attachment-service.js`, `modules/inbox/routes.js`, and `domain-schema.js`.
- [x] T062 [P] [US2] Write RED queue/unassigned/mine/all/closed/SLA/snoozed/follow-up view tests in `test/inbox-view-contract.test.js`.
- [x] T063 [US2] Implement complete Inbox list filters/shareable URLs in `modules/inbox/store.js`, `modules/inbox/workspace.js`, and `modules/inbox/routes.js`.
- [x] T064 [P] [US2] Write RED assignment/transfer/reason/history and round-robin/least-load concurrency tests in `test/postgres-routing-assignment.test.js`.
- [x] T065 [US2] Implement assignment events and transactional routing engine in `modules/inbox/routing-service.js`, `workers/routing-worker.js`, and `domain-schema.js`.
- [x] T066 [P] [US2] Write RED business-calendar/timezone/holiday/SLA pause-breach-escalation tests in `test/sla-calendar.test.js`.
- [x] T067 [US2] Implement calendars, SLA instances/events, timers, and escalations in `modules/inbox/sla-service.js`, `workers/sla-worker.js`, and `domain-schema.js`.
- [x] T068 [P] [US2] Write RED presence/collision, note versions, macro authorization, snooze, and follow-up tests in `test/inbox-collaboration.test.js`.
- [x] T069 [US2] Implement bounded presence, collision/version feedback, notes, macros, snooze, and follow-up in `modules/inbox/collaboration-service.js`, routes/workspace, and `domain-schema.js`.
- [x] T070 [US2] Implement authorized DLQ/retry/reconcile/cancel console in `modules/operations/recovery-routes.js` and `modules/operations/recovery-workspace.js` with tests in `test/browser-recovery-console.test.js`.
- [ ] T071 [US2] Run US2 unit/contract/PostgreSQL/browser/resilience/performance tests and a real local data-plane conversation canary; update traceability.

## Phase 6 — US3: Customer 360 and CRM Operations (P1)

**Independent test**: Create duplicates, consent/opt-out, typed fields, opportunity, import, merge, export, bulk action, and verify one tenant-scoped timeline.

- [x] T072 [US3] Write RED contact identity normalization, collision, consent, suppression, and eligibility tests in `test/postgres-contact-identity-consent.test.js`.
- [x] T073 [US3] Implement contact identities, append-only consent, suppression, eligibility service, and migration in `modules/crm/contact-service.js`, `modules/crm/eligibility-service.js`, and `domain-schema.js`.
- [x] T074 [P] [US3] Write RED custom-field definition/value type and tag lifecycle tests in `test/crm-schema-tags.test.js`.
- [x] T075 [US3] Implement typed custom fields and tag workflows in `modules/crm/schema-service.js`, `modules/crm/routes.js`, `modules/crm/workspace.js`, and `domain-schema.js`.
- [x] T076 [P] [US3] Write RED pipeline/stage/value/history and external-reference tests in `test/opportunity-external-record.test.js`.
- [x] T077 [US3] Implement opportunities, pipelines, stage events, and read-only external references in `modules/crm/opportunity-service.js` and `domain-schema.js`.
- [x] T078 [P] [US3] Write RED unified timeline ordering/pagination/isolation tests in `test/postgres-contact-timeline.test.js`.
- [x] T079 [US3] Implement rebuildable tenant-scoped timeline projection in `modules/crm/timeline-service.js`, `workers/timeline-worker.js`, and `domain-schema.js`.
- [x] T080 [P] [US3] Write RED merge preview/version-conflict/transaction/reference-preservation tests in `test/postgres-contact-merge.test.js`.
- [x] T081 [US3] Implement contact merge preview/commit service and workspace in `modules/crm/merge-service.js`, routes/workspace, and `domain-schema.js`.
- [x] T082 [P] [US3] Write RED CSV mapping/preview/encoding/formula/duplicate/row-error/idempotency tests in `test/contact-import.test.js`.
- [x] T083 [US3] Implement bounded import jobs and row outcomes in `modules/crm/import-service.js`, `workers/import-worker.js`, and `domain-schema.js`.
- [x] T084 [P] [US3] Write RED privileged expiring export and bounded bulk action authorization/idempotency tests in `test/contact-export-bulk.test.js`.
- [x] T085 [US3] Implement export/bulk jobs and workspace states in `modules/crm/export-service.js`, `modules/crm/bulk-service.js`, workers, and `domain-schema.js`.
- [ ] T086 [US3] Run the complete customer-360 browser journey and PostgreSQL BOLA suite; update traceability.

## Phase 7 — US4: Dynamic Segments and Governed Campaigns (P1)

**Independent test**: Build/preview a dynamic segment, schedule a campaign, prove recipient eligibility, kill it, and reconcile all outcomes.

- [x] T087 [US4] Write RED typed segment expression validation/compiler/preview parity and injection tests in `test/segment-engine.test.js`.
- [x] T088 [US4] Implement versioned allowlisted segment AST/compiler in `modules/marketing/segment-compiler.js` and schema in `domain-schema.js`.
- [x] T089 [P] [US4] Write RED dynamic membership/exclusion/recompute/idempotency/isolation tests in `test/postgres-segment-refresh.test.js`.
- [x] T090 [US4] Implement segment preview/refresh jobs, membership projection, routes, and workspace in `modules/marketing/segment-service.js`, `workers/segment-worker.js`, and related files.
- [x] T091 [P] [US4] Write RED campaign lifecycle/approval/schedule/timezone/pause/resume/cancel tests in `test/campaign-lifecycle.test.js`.
- [x] T092 [US4] Implement campaign aggregate/routes/workspace and immutable version references in `modules/marketing/campaign-service.js`, routes/workspace, and `domain-schema.js`.
- [x] T093 [P] [US4] Write RED 100-way dispatch idempotency, send-time eligibility, quotas/throttle, kill switch, and no-ineligible-recipient tests in `test/postgres-campaign-dispatch.test.js`.
- [x] T094 [US4] Implement campaign prepare/batch/recipient/reconcile jobs in `workers/campaign-worker.js` and `modules/marketing/campaign-dispatch.js`.
- [x] T095 [P] [US4] Write RED campaign attribution/delivery/read/failure/opt-out metric reconciliation tests in `test/campaign-metrics.test.js`.
- [x] T096 [US4] Implement recipient attempts/events and campaign metrics in `modules/marketing/campaign-metrics.js` and `domain-schema.js`.
- [x] T097 [US4] Run the complete segment/campaign browser, DB concurrency, provider-fake, and cancellation acceptance; update traceability.

## Phase 8 — US5: Executable Automations and Integrations (P1)

**Independent test**: Dry-run, activate, replay, inspect, roll back, kill a rule, and inject integration timeout/conflict/recovery without duplicate effects.

- [x] T098 [US5] Write RED immutable automation version, typed trigger/condition/action, validation, and state-transition tests in `test/automation-rule-model.test.js`.
- [x] T099 [US5] Implement versioned automation aggregate and typed registry in `modules/automation/rule-service.js`, `modules/automation/action-registry.js`, and `domain-schema.js`.
- [x] T100 [P] [US5] Write RED dry-run/no-effect, deterministic trace, replay idempotency, schedule/timeout/fallback/handoff tests in `test/postgres-automation-engine.test.js`.
- [x] T101 [US5] Implement automation evaluation/action/timer jobs in `modules/automation/engine.js`, `workers/automation-worker.js`, and `domain-schema.js`.
- [x] T102 [US5] Implement automation versions, dry-run, activation, rollback, pause, run history routes/workspace in `modules/automation/routes.js` and `modules/automation/workspace.js`.
- [x] T103 [P] [US5] Write RED typed customer/order/ticket/payment/catalog/calendar adapter contracts and disabled modes in `test/business-integration-contract.test.js`.
- [x] T104 [US5] Implement integration registry/adapters and opaque payment-link boundary in `modules/integrations/`.
- [x] T105 [P] [US5] Write RED sync external-version/conflict/retry/circuit/reconciliation tests in `test/postgres-integration-sync.test.js`.
- [x] T106 [US5] Implement sync records/attempts and integration jobs in `modules/integrations/sync-service.js`, `workers/integration-worker.js`, and `domain-schema.js`.
- [x] T107 [P] [US5] Write RED scoped API credential, signed incoming/outgoing webhook, replay, rotation, DLQ, and documentation tests in `test/external-api-webhook.test.js`.
- [x] T108 [US5] Implement scoped API/webhook routes, credentials, signing, delivery jobs, and generated current API documentation in `modules/integrations/api-service.js`, `server.js`, and `docs/api-docs/API.md`.
- [x] T109 [US5] Run US5 browser, PostgreSQL, contract-fake, fault-injection, and recovery acceptance; update traceability.

## Phase 9 — US6: Knowledge and Human-Controlled AI (P2)

**Independent test**: Publish versioned ACL content, retrieve tenant-safe citations, generate redacted assistance, record disposition, and deny unsafe/unconfirmed tools.

- [x] T110 [US6] Write RED article/version/validity/owner/ACL state tests in `test/knowledge-lifecycle.test.js`.
- [x] T111 [US6] Implement knowledge aggregate, routes, and workspace in `modules/knowledge/article-service.js`, routes/workspace, and `domain-schema.js`.
- [x] T112 [P] [US6] Write RED tenant/ACL/freshness-safe keyword/full-text indexing/retrieval tests with colliding tenant corpora in `test/postgres-knowledge-retrieval.test.js`.
- [x] T113 [US6] Implement indexing/retrieval jobs and citation results in `modules/knowledge/retrieval-service.js`, `workers/indexing-worker.js`, and `domain-schema.js`.
- [x] T114 [P] [US6] Write RED deterministic feature-flag, provider-disabled, pre-provider PII-redaction, timeout, and audit tests in `test/ai-policy-redaction.test.js`.
- [x] T115 [US6] Implement AI flags/policies, redaction gate, provider adapter boundary, invocations, and disabled workspace in `modules/ai/` and `domain-schema.js`.
- [x] T116 [P] [US6] Write RED classification/summary/suggestion/citation/handoff and human accept-edit-reject tests in `test/ai-assistance-workflows.test.js`.
- [x] T117 [US6] Implement AI assistance jobs/routes/workspace and handoff packages in `workers/ai-worker.js` and `modules/ai/`.
- [x] T118 [P] [US6] Write RED typed tool allowlist/domain authorization/confirmation/idempotency/unknown-outcome tests in `test/ai-tool-safety.test.js`.
- [x] T119 [US6] Implement tool preview/execute gate and irreversible confirmation in `modules/ai/tool-service.js`.
- [x] T120 [P] [US6] Create versioned synthetic pt-BR adversarial corpus in `test/fixtures/ai-evaluation-ptbr.json` and RED evaluation gate in `test/ai-evaluation.test.js`.
- [x] T121 [US6] Implement evaluation runner/results and broad-enable gate in `modules/ai/evaluation-service.js`, `workers/ai-evaluation-worker.js`, and `domain-schema.js`.
- [x] T122 [US6] Run US6 knowledge/browser/adversarial/BOLA tests; record optional live-model canary as PASS or bounded external blocker and update traceability.

## Phase 10 — US8: Real Reports and Operational Observability (P1)

**Independent test**: A fixed event fixture reproduces all counts/percentiles and exports while health exposes true component state and correlation.

- [x] T123 [US8] Define versioned metric catalog and fixed timestamped fixture in `modules/reporting/metric-definitions.js` and `test/fixtures/metric-events.js`.
- [x] T124 [US8] Write RED metric denominator, p50/p90/p95, dimension, timezone, and fixture-reconciliation tests in `test/report-metrics.test.js`.
- [x] T125 [US8] Implement metric events/rollups and shared query engine in `modules/reporting/metric-service.js`, `workers/metrics-worker.js`, and `domain-schema.js`.
- [x] T126 [P] [US8] Write RED dashboard/report filter and UI/export definition parity tests in `test/report-workspace-export.test.js`.
- [x] T127 [US8] Implement dashboard/reports/routes/workspace/export jobs in `modules/reporting/`, `workers/export-worker.js`, `server.js`, and `workspace.js`.
- [x] T128 [P] [US8] Write RED liveness/readiness/backlog-age/retry/DLQ/heartbeat/provider/release-state tests in `test/observability-complete.test.js`.
- [x] T129 [US8] Split `/live` and `/ready`, implement system status and propagate trace/correlation through status routes in `server.js` and `modules/operations/system-status.js`.
- [x] T130 [P] [US8] Write RED alert state/dedup/acknowledgement/escalation tests in `test/alerting.test.js`.
- [x] T131 [US8] Implement alert persistence/evaluation worker and status workspace in `modules/reporting/alert-service.js`, `workers/alert-worker.js`, `modules/reporting/status-workspace.js`, `server.js`, and `domain-schema.js`.
- [x] T132 [US8] Run report fixture, browser export, health degradation, correlation, and alert acceptance; update traceability and save `evidence/002-complete-ui-modules/us8-reports-observability.json`.

## Phase 11 — US9: Reproducible Release, Recovery, and Final Proof (P1)

**Independent test**: Clean install, representative upgrade, full no-skip gate, versioned deploy, isolated restore, rollback rehearsal, and independent live data-plane validation all pass.

- [ ] T133 [US9] Write RED acceptance-runner tests rejecting every missing prerequisite, skip, empty suite, stale/mismatched evidence, placeholder assertion, and unmapped parity row in `test/acceptance-gate.test.js`.
- [ ] T134 [US9] Complete `test/acceptance-manifest.json` mappings for G01–G12 and every traceability row; make `scripts/acceptance-gate.mjs` GREEN.
- [ ] T135 [P] [US9] Implement representative load/resilience harness in `scripts/performance-resilience-gate.mjs` and tests in `test/performance-resilience-contract.test.js`.
- [ ] T136 [US9] Prove webhook/Inbox p95 < 500 ms, search p95 < 1 s, backpressure, crash/retry recovery, and no silent loss; save sanitized release-bound evidence under `evidence/002-complete-ui-modules/`.
- [ ] T137 [P] [US9] Implement reproducible tracked-file release artifact/manifest generation and verification in `scripts/build-release-artifact.mjs` with tests in `test/release-artifact.test.js`.
- [ ] T138 [P] [US9] Implement clean-install and representative-upgrade gate in `scripts/migration-gate.mjs` with tests in `test/migration-gate.test.js`.
- [ ] T139 [P] [US9] Implement encrypted off-host backup and isolated timed restore drill script in `scripts/backup-restore-drill.sh` following secret-safe tmux policy.
- [ ] T140 [P] [US9] Implement atomic activation and rollback drill in `scripts/deploy-release-vpstsiapp.sh` and `scripts/rollback-release-vpstsiapp.sh` with private logs/separate exit files.
- [ ] T141 [P] [US9] Implement independent remote validation/data-plane canary in `scripts/validate-release-vpstsiapp.sh`, using a second named idempotent tmux session.
- [ ] T142 [US9] Run `node scripts/acceptance-gate.mjs` locally with all mandatory suites and zero skips; fix root causes until PASS.
- [ ] T143 [US9] Build and verify the candidate artifact, execute clean install/upgrade and restore/rollback drills, and bind all evidence to one release hash.
- [ ] T144 [US9] Deploy via `tsi-crm-release-002` after timestamped backup; retrieve only sanitized log and exit evidence.
- [ ] T145 [US9] Validate via distinct `tsi-crm-validate-002` and an observed data-plane canary covering persistence, worker processing, release identity, and cross-tenant denial.
- [ ] T146 [US9] Rehearse rollback via `tsi-crm-rollback-002`, independently validate the prior release, then restore the candidate through the governed deployment path.
- [ ] T147 [US9] Update `docs/CRMTSIAPP-SELF-HOSTED-PARITY-MATRIX.md` row by row to `Completo` or tightly bounded `Bloqueado externo`, referencing current evidence.
- [ ] T148 [US9] Update `README.md`, API/architecture/operator/recovery docs, `CRMTSiAPP_Self-Hosted.md` implementation notes, and release identity documentation to observed behavior.
- [ ] T149 [US9] Update `~/Projects/TSiHomeLab/VMs/VPSTSIAPP/README.md` and `~/Projects/TSiHomeLab/VMs/README.md` with deployment, services, backup/restore, release, and validation evidence.
- [ ] T150 [US9] Run final independent review against `spec.md`, constitution, contracts, traceability, and live runtime; no completion claim while any mandatory task/evidence remains open.

## Dependencies and Execution Order

- Phase 1 blocks all implementation claims.
- Phase 2 blocks all domain phases.
- US1 route/action scaffolding depends on Phase 2 and is continuously extended by later stories.
- US7 identity/scope/security foundation blocks externally visible effects in US2–US6 and privileged reporting/recovery.
- US2 and US3 block US4.
- US3 and shared jobs block US5; stable domain actions from US2/US3 support automation.
- Knowledge lifecycle in US6 precedes AI retrieval/assistance.
- Domain events from US2–US7 block final US8 metric completeness.
- US9 blocks final parity closure and production completion.

## Parallel Opportunities

- Within a phase, `[P]` test/fixture tasks may run in parallel when they touch different files.
- After Phase 4, selected US2 and US3 RED-test streams can proceed in parallel, but US4 waits for both accepted foundations.
- Provider contract fakes, browser fixtures, accessibility checks, and documentation scaffolding can proceed alongside domain RED tests.
- Remote deployment, restore, and rollback never run concurrently against the same target.

## Final Gate

The feature is complete only when T001–T150 are checked with observed artifacts, the full acceptance manifest passes with zero mandatory skips, live deployment and independent validation share the candidate release hash, recovery objectives are met, documentation matches runtime, and every normative parity row satisfies its gate.
