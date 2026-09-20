# Research: Complete UI Modules

**Feature**: `002-complete-ui-modules`  
**Date**: 2026-09-19  
**Normative sources**: `CRMTSiAPP_Self-Hosted.md`, `docs/CRMTSIAPP-SELF-HOSTED-PARITY-MATRIX.md`, `.specify/memory/constitution.md`

## Purpose

Resolve implementation decisions for full product completion without narrowing the normative scope. This artifact records the current reusable foundation, the remaining gaps, the chosen architecture, rejected alternatives, sequencing, testing/evidence requirements, and behavior when external providers are unavailable.

## Current-State Baseline

### Observed Wave 0 RED baseline (2026-09-19)

The first composed local run intentionally remained fail-closed:

- `npm run test:static`: PASS after adding lock-integrity, dependency-audit, syntax, diff, credential-pattern, and Supabase-runtime checks.
- `node --test`: FAIL with 201 tests: 183 passed, 11 failed, and 7 skipped.
- The seven skips are all mandatory PostgreSQL-real cases because no isolated `TEST_DATABASE_URL` or `TEST_DATABASE_ADMIN_URL` was configured locally.
- The eleven failures identify real shared-foundation drift: expected migration source contracts for tenant ownership, durable leases, automation/privacy/metric tables, session revocation, and outbox/webhook constraints are not yet aligned with the restored domain schema.
- `npm run test:acceptance`: FAIL as designed because release-bound evidence files for G01–G13 do not yet exist.

No skipped, empty, stale, mismatched-release, or absent-evidence suite is counted as success. T010 remains open until the setup gate can emit valid G01 evidence while preserving later product gates as RED.

The existing application already provides a usable PostgreSQL-backed foundation:

- Server-rendered Node.js application with session authentication, CSRF handling, RBAC capability checks, tenant context, and audit helpers.
- Tenant-scoped Inbox, contacts, leads, connections, dashboard, settings reads, queue/template creation, automation-rule creation, and privacy-request creation.
- Durable webhook and outbound pipelines with dedicated workers, attempts, retry concepts, service units, health checks, and provider adapters.
- PostgreSQL migrations, tenant-aware domain tables, route-capability registry, test fixtures, and an expanding `node:test` suite.
- Live deployment procedures based on backup, named tmux deployment, independent tmux validation, and runtime health checks.

This is not full parity. The fail-closed matrix still identifies incomplete behavior in every major category. Several visible workspaces accurately disclose gaps but remain non-executable. Existing tables or static UI do not satisfy a workflow.

## Gap Assessment by Delivery Wave

### Wave 0 — Truth and Acceptance Harness

**Observed gap**: Current tests prove important security and settings regressions, but there is no single manifest that maps every normative row to mandatory local, database, browser, resilience, and live evidence. Some database suites can skip when environment variables are absent.

**Decision**: Create a machine-readable acceptance manifest and runner. Required suites fail when missing, skipped, stale, or reduced to source-text assertions. Maintain a row-level traceability ledger containing requirement ID, implementation owner, migration, route/action, job, tests, runtime evidence, and documentation state.

**Rationale**: A large implementation can otherwise accumulate false completion through isolated green tests.

**Alternative rejected**: Continue using ad hoc `npm test` plus prose. It cannot prove that every matrix row or critical environment-dependent suite ran.

### Wave 1 — Identity, Scope, and Security Foundation

**Observed gaps**:

- Coarse roles exist, but object/team/ownership scope is incomplete.
- Granular operational roles, complete team/capacity lifecycle, mandatory admin MFA, and external identity are missing.
- Audit events are not yet a complete immutable before/after ledger for all domains.
- Durable quotas, consistent response hardening, secret rotation, and broad BOLA coverage remain incomplete.

**Decision**: Extend the existing capability model rather than replace it. Authorization decisions use resource, action, tenant, team, object ownership, and operational scope. Introduce role definitions for agent, supervisor, manager, marketing, administrator, privacy/auditor, and integration/developer operator. MFA and external identity attach to the existing user/session lifecycle. Audit becomes append-only with integrity chaining or equivalent tamper-evident verification.

**Rationale**: Every later domain depends on consistent scope, actor identity, and audit evidence.

**Alternative rejected**: Implement per-module role checks. This would duplicate policy and create privilege drift.

### Wave 2 — Messaging and Inbox

**Observed gaps**:

- Provider behavior is partially covered, but full live/contract evidence, media, stable pagination, message full-text search, and operational recovery are open.
- Inbox lacks complete queue/unassigned views, automated routing, calendar-aware SLA, presence/collision feedback, macros, complete internal notes, snooze/follow-up, and attachment workflows.
- Correlation across webhook, worker, provider, and status update is incomplete.

**Decision**: Reuse the webhook and outbox primitives as the canonical event path. Add tenant-leading keyset cursors, PostgreSQL full-text search, media metadata and controlled access, assignment/SLA event histories, bounded presence, and a recovery console over shared job primitives. Route every outbound effect through the existing outbox abstraction.

**Rationale**: Preserves working durability and provider-policy code while closing user-visible and operator-recovery gaps.

**Alternative rejected**: Add direct provider calls from UI routes. This would violate durability, responsiveness, idempotency, and recovery requirements.

### Wave 3 — Customer 360 and CRM Operations

**Observed gaps**:

- Contacts and leads are basic; consent, suppression, typed custom fields, merge, unified timeline, import/export, and bulk operations are absent.
- Tags and opportunities are only partial.

**Decision**: Make contact identity and communication eligibility authoritative domain services. Store append-only consent/suppression evidence and materialized current eligibility. Use typed field definitions plus validated values. Implement merge as preview plus one transaction that re-points allowed references and records before/after evidence. Imports, exports, and bulk actions are durable jobs with row/object outcomes.

**Rationale**: Segmentation, campaigns, automation, privacy, and reporting all require stable customer identity and consent state.

**Alternative rejected**: Encode custom data in one unvalidated JSON object and perform synchronous CSV work. This weakens validation, indexing, auditability, and operational limits.

### Wave 4 — Segments and Campaigns

**Observed gap**: Both workspaces are placeholders. There is no typed segment engine, dynamic membership, campaign lifecycle, recipient eligibility, scheduling, throttling, cancellation, or attribution.

**Decision**: Represent segment criteria as a versioned typed expression tree with allowlisted fields/operators, not SQL fragments. Preview and recomputation call the same compiler. A campaign references an immutable segment/template version, then creates recipient records that are revalidated at dispatch time. A dedicated worker enforces tenant quotas, throttling, suppression, service-window/template policy, cancellation, and stable recipient idempotency keys.

**Rationale**: Shared evaluation prevents preview/dispatch drift and eliminates arbitrary query injection.

**Alternative rejected**: Save raw SQL or snapshot phone lists. Raw SQL is unsafe; one-time snapshots become legally and operationally stale without send-time revalidation.

### Wave 5 — Automation and Integrations

**Observed gaps**:

- Automation rules can be persisted, but there is no deterministic engine, versioning, dry-run, history, rollback, or kill switch.
- Integration configuration lacks typed provider contracts, sync state, external webhooks/API credentials, reconciliation, and uniform fault handling.

**Decision**: Use versioned immutable rule definitions and append-only executions. Triggers create jobs with stable event/rule-version keys. Conditions and actions are typed and allowlisted. Dry-run evaluates the same engine with side effects replaced by recorded proposals. Integrations implement domain interfaces and normalize external identities, versions, statuses, and errors at adapter boundaries.

**Rationale**: Deterministic replay, safe simulation, and idempotent actions are impossible with mutable untyped rules.

**Alternative rejected**: General-purpose scripts, arbitrary URLs, or arbitrary SQL actions. They bypass authorization, tenancy, audit, and security boundaries.

### Wave 6 — Knowledge and Optional AI

**Observed gap**: AI is a placeholder and no governed knowledge model or tenant-safe retrieval exists.

**Decision**: Implement knowledge first as a provider-independent feature: versioned articles, owner, validity, ACL, indexing, keyword/full-text retrieval, and citations. AI remains disabled by default and is enabled through tenant/team/percentage flags. External model calls require pre-provider PII redaction, bounded timeout, allowlisted purpose, tenant-filtered evidence, recorded model/policy versions, and human disposition. Tools are typed domain actions and irreversible operations require explicit confirmation.

**Rationale**: Useful knowledge workflows do not depend on model availability, and AI safety depends on a governed retrieval corpus and domain authorization.

**Alternative rejected**: Send raw conversation history to a model or expose generic HTTP/SQL tools. Both create unacceptable privacy and authorization risk.

### Wave 7 — Privacy, Governance, Reporting, and Observability

**Observed gaps**:

- Privacy requests exist but do not execute complete access/export/anonymize/delete workflows.
- Retention, suppliers, international transfers, incidents, legal hold, and escalation are incomplete or absent.
- Dashboard has some real KPIs, while reports, dimensions, percentiles, exports, broad business metrics, alerting, separate liveness/readiness, and full trace propagation remain open.

**Decision**: Privacy and reporting operate from append-only domain events plus current-state tables. Privacy steps are explicit jobs with verification, approvals where required, per-system outcomes, legal-hold decisions, and expiring artifacts. Metric definitions are versioned and shared by dashboards, reports, exports, and fixture reconciliation. Liveness proves process life; readiness reports required dependency state without conflating the two.

**Rationale**: Legal evidence and trustworthy metrics require reproducible definitions and state transitions, not ad hoc queries or mutable status alone.

**Alternative rejected**: One synchronous privacy handler and per-page report queries. They are not recoverable, auditable, or definition-consistent.

### Wave 8 — Release and Recovery

**Observed gaps**:

- Deployment is operationally disciplined but not yet based on a fully governed release manifest with all mandatory no-skip gates.
- Migration checksums/locking, clean-install and representative-upgrade evidence, off-host encrypted backup, timed restore, canary progression, artifact identity, and rollback rehearsal remain incomplete.

**Decision**: Produce a versioned release artifact and manifest containing source hash, dependency lock hash, migration checksums, test evidence, and service definitions. Run clean install and upgrade fixtures before deployment. Back up before mutation, activate atomically, validate in a distinct tmux session, execute a real data-plane canary, and retain rollback/restore evidence.

**Rationale**: Runtime health alone does not prove release reproducibility or recoverability.

**Alternative rejected**: Continue copying mutable source into the live directory. It obscures release identity and weakens rollback.

## Reuse Map

| Existing component | Reuse decision | Extension boundary |
|---|---|---|
| `server.js` | Keep as HTTP composition root | Delegate domain mutations/queries to module services; avoid adding large inline workflows |
| `workspace.js` | Keep shared layout and existing workspaces | Move module-specific render models into bounded modules as they become executable |
| `authorization.js`, `rbac.js`, `route-capabilities.js` | Extend | Add scoped decisions, granular roles, and complete route/action registry |
| `tenant-context.js` | Reuse as mandatory request boundary | Require explicit tenant in services/jobs and prohibit default fallback |
| `migrate.js`, `domain-schema.js` | Extend incrementally | Add governed versions, checksums, ordering, fresh/upgrade fixtures, and rollback metadata |
| `outbox.js`, `outbox-worker.js` | Reuse core delivery pattern | Generalize shared job lease/retry/recovery primitives without conflating domain payloads |
| `channel-adapter.js`, webhook services/workers | Reuse provider boundary | Normalize contracts, correlation, media, status, fault injection, and canaries |
| Current audit helpers | Extend | Ensure transactional tenant-scoped append-only coverage and integrity verification |
| Existing `node:test` harness | Reuse | Add mandatory suite manifest, PostgreSQL-real, browser, security, load, restore, and no-skip gates |
| Existing deploy/diagnostic scripts | Reuse policy and patterns | Build versioned artifact, migration, rollback, restore, and independent validation scripts |

## Cross-Cutting Architectural Decisions

### Explicit Operation Context

Every service and job receives an explicit operation context containing tenant identity, actor/service identity, authorization decision or capability set, correlation identifier, and request/job metadata. No business service discovers a tenant implicitly or falls back to a global default.

### Transactional Intent

A mutation that causes asynchronous work writes domain state, audit evidence, and job/outbox intent in one database transaction. Workers never infer missing intent by scanning mutable business tables.

### Append-Only Evidence with Materialized Current State

Consent, assignments, delivery, campaign, automation, privacy, AI, incident, and release transitions are append-only. Current-state columns or tables exist for efficient reads but can be reconciled from events and are never the sole evidence.

### Shared Job Contract

Campaign, automation, integration, privacy, export, and indexing workers share envelope, lease, heartbeat, retry, cancellation, dead-letter, recovery, and metrics semantics. Domain payloads and capabilities remain typed and separate.

### Safe Query Compilation

Search filters, segments, reports, and exports compile only allowlisted fields, operators, dimensions, and sort keys into parameterized queries. No UI-authored SQL or arbitrary expression execution is permitted.

### Capability-Derived Navigation

Navigation is rendered from effective capabilities and provider/feature state, but server authorization remains authoritative. Disabled optional features explain prerequisites accurately; they do not expose nonfunctional controls.

## Provider and Disabled-Mode Decisions

### Messaging Providers

- Contract fakes are mandatory for deterministic inbound, outbound, status, media, retry, rate-limit, and malformed-response tests.
- Live canaries use approved credentials only from the secret-management path.
- If credentials are absent, configuration and business workflows remain usable where possible, and the provider is shown as disabled/unverified—not healthy.

### External Identity

- Implement a standards-based OIDC contract first, integrated with existing users, roles, sessions, MFA policy, and tenant mapping.
- SAML remains explicitly tier/provider dependent and may be `Bloqueado externo` only after local policy and disabled-mode behavior are complete.

### Business Integrations

- Providers implement typed customer/order/ticket/payment/catalog/calendar interfaces.
- Unconfigured providers expose setup state and never fabricate synchronized records.
- Payment handling stores provider references or links, not financial credentials.

### AI Providers

- Core CRM and knowledge functions never require an AI provider.
- Provider absence produces a clear disabled state and no outbound transmission.
- Contract fakes exercise timeout, unsafe output, citation gaps, PII attempts, token/cost metadata, and tool denial.
- Only the final live model canary may remain externally blocked; tenant isolation, redaction, evaluation, tool authorization, confirmation, and audit cannot be blocked.

## Security and Tenant Risks

| Risk | Required control and evidence |
|---|---|
| Cross-tenant object identifiers | Tenant-leading predicates, tenant-qualified relations, indistinguishable denial, adversarial BOLA suite |
| Cross-tenant search/vector leakage | Tenant filter applied before ranking/retrieval; negative corpus with colliding content |
| Job replay or concurrent lease | Stable idempotency key, fenced lease token, atomic transition, 100-way concurrency test |
| Consent changes after scheduling | Re-evaluate suppression and eligibility immediately before dispatch |
| Secret leakage through redirects or DNS changes | Resolve and pin safe destination, reject unsafe answers/redirects, redact logs/errors, negative transport tests |
| Malicious imports/attachments | Bounded size/type, formula neutralization, malware disposition, expiring access, row/object isolation |
| Privilege change during long job | Re-check authorization/policy at sensitive execution and artifact retrieval boundaries |
| AI prompt/tool injection | Evidence isolation, typed tools, domain authorization, confirmation, output validation, adversarial pt-BR corpus |
| Privacy deletion conflicting with legal hold | Explicit policy decision, authorized override path, immutable evidence, no silent partial completion |
| Audit tampering | Append-only permissions, integrity verification, backup inclusion, periodic check |
| Metric drift | Versioned definitions and fixed fixture reconciliation shared by UI and export |
| False-green release | Required-suite manifest rejects skips, absent environment, stale evidence, and placeholder assertions |

## Testing and Evidence Architecture

### Test Layers

1. **Pure unit**: validators, state transitions, role/scope decisions, segment compiler, metric definitions, redaction, and provider normalization.
2. **Contract**: HTTP routes, forms, JSON/webhooks, provider adapters, job envelopes, errors, and disabled states.
3. **PostgreSQL-real**: migrations, constraints, transactions, keyset pagination, full-text search, tenant isolation, concurrency, leases, idempotency, and query plans.
4. **Authenticated browser**: every visible route and primary workflow for each role, reload persistence, validation, empty/error/disabled states, keyboard and accessibility checks.
5. **Adversarial security/privacy**: BOLA, CSRF, replay, SSRF/rebinding, injection, secret leakage, export expiry, legal hold, PII redaction, and unauthorized AI tools.
6. **Resilience/performance**: database/provider delays, malformed responses, worker death, lease expiry, retry storms, quota pressure, and documented percentile targets.
7. **Release/recovery**: clean install, representative upgrade, artifact verification, backup, isolated restore, deployment, data-plane canary, and rollback.

### Evidence Rules

- Required tests may not be skipped. Missing database, browser, provider fake, fixture, or environment prerequisite fails the acceptance gate.
- Each remote action records sanitized command identity, UTC timestamp, session name, artifact/release hash, exit status, and bounded log location.
- Deployment evidence and final validation come from separate named tmux sessions.
- A second validation observes real data-plane behavior, not only service-manager status or dashboard claims.
- Documentation and parity state update only after evidence passes.

## Sequencing and Dependency Decisions

1. Build the acceptance manifest and traceability ledger first so later work cannot claim completion ambiguously.
2. Finish identity, scope, tenancy, audit, and shared job primitives before adding new high-risk domain workflows.
3. Finish Inbox and customer eligibility before campaigns, because campaigns depend on contacts, consent, templates, delivery, and recovery.
4. Build segments before campaign dispatch; use the same expression compiler for preview and membership.
5. Build typed automation actions and integration contracts after core CRM operations expose stable services.
6. Build knowledge governance before AI retrieval or suggestions.
7. Build domain event coverage before final reports, privacy execution, and alerting.
8. Run migration/release/recovery gates continuously per wave, then perform full closure in Wave 8.

## Decisions Requiring No Further Clarification

- PostgreSQL remains the sole canonical data store.
- The current server-rendered architecture is evolved incrementally; no frontend/framework rewrite is planned.
- Core workflows must operate without optional external providers.
- OIDC is the primary external identity contract; SAML is capability/tier dependent.
- AI is optional, disabled by default, and cannot authorize itself.
- Jobs are database-backed and use shared lease/idempotency semantics.
- Segments and automation use typed allowlisted expressions/actions, never arbitrary SQL or scripts.
- Reports use centralized versioned metric definitions.
- Completion is fail closed and requires no skipped mandatory suite plus independent live validation.

## Planning Conclusion

The existing codebase is a viable foundation, but full-system completion is a multi-wave product program, not a continuation of route repair. The selected approach minimizes rewrite risk by preserving working entry points, tenant context, outbox, adapters, and tests while introducing bounded domain services, common durable-job semantics, append-only evidence, and a mandatory acceptance manifest. Implementation should now be decomposed into story-oriented tasks with Wave 0 and Wave 1 as hard dependencies for all later completion claims.
