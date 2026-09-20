# Implementation Plan: Complete UI Modules

**Branch**: `002-complete-ui-modules` | **Date**: 2026-09-19 | **Spec**: `specs/002-complete-ui-modules/spec.md`

**Input**: Finish every open capability in `CRMTSiAPP_Self-Hosted.md` and `docs/CRMTSIAPP-SELF-HOSTED-PARITY-MATRIX.md` with executable tenant-scoped workflows and independent live evidence.

## Summary

Complete the product through vertical, independently releasable slices rather than building isolated tables or pages. Preserve the existing server-rendered Node.js/PostgreSQL architecture, extract bounded domain services and workers where concurrency or integration requires them, and make every capability fail closed through behavioral RED/GREEN tests, PostgreSQL-real isolation/concurrency tests, authenticated browser journeys, reversible deployment, and independent runtime validation.

The first delivery wave closes the advertised business modules: customer 360, Inbox completeness, segments/campaigns, automation/integrations, knowledge/AI, privacy/governance, and reports. Cross-cutting identity, security, observability, performance, migration, backup, and release gates are implemented before any row can become `Completo`.

## Technical Context

**Language/Version**: Node.js >=22, CommonJS, server-rendered HTML/CSS/JavaScript

**Primary Dependencies**: `pg`, `undici`, Node.js standard library, current project packages; new dependencies require a proven gap and pinned versions

**Storage**: PostgreSQL 17.x as the single canonical application store; encrypted off-host backup artifacts for continuity

**Testing**: built-in `node:test`; PostgreSQL-real suites using isolated test databases; authenticated browser acceptance; contract, concurrency, BOLA, accessibility, security, resilience, load, migration, backup/restore, deployment, and rollback gates

**Target Platform**: Debian 13 `vpstsiapp`, systemd-managed web/outbox/webhook workers, application rooted at `/opt/tsi-stack/apps/crm/crmtsiapp/`, published as `https://crm.tsiapp.io`

**Project Type**: Self-hosted server-rendered CRM web application with durable asynchronous workers and external provider adapters

**Performance Goals**: webhook acknowledgement and Inbox p95 < 500 ms; search p95 < 1 s; no silent data loss under representative load; recovery objectives RPO <= 15 min and RTO <= 60 min

**Constraints**: pure PostgreSQL with no Supabase; deny-by-default tenant and object scope; optional provider features must degrade explicitly; no secrets in source/argv/logs; remote payloads and probes run in named idempotent tmux sessions with private logs and exit files; production changes require backup and independent validation

**Scale/Scope**: nine end-to-end user journeys, 36 functional requirements, all open rows in the normative parity matrix, all visible routes/actions, and web plus independent worker processes

## Constitution Check

*GATE: Passed before research and must be re-checked after each design wave.*

- **Test-First**: Every behavior begins with an observed failing test. PostgreSQL-real coverage is mandatory for schema, tenancy, idempotency, transactions, concurrency, search, jobs, and migrations.
- **Tenant Isolation**: Every entity and operation carries an explicit tenant. IDs, search, exports, media, background jobs, retrieval, AI context, integrations, and recovery actions receive adversarial cross-tenant tests.
- **Evidence-First**: A parity row changes to `Completo` only with source, automated evidence, browser/data-plane evidence, live runtime evidence, and matching documentation. Conditional skips, placeholders, and static screens fail the gate.
- **Reversibility & Production Safety**: Deployment uses versioned artifacts, pre-change backup, idempotent migration, atomic activation, rollback instructions, named tmux sessions, and independent second-session validation.
- **Pure Local Storage**: PostgreSQL remains canonical. No Supabase dependency or hidden external state may be required for core functionality.

No constitution violation is accepted. Any unavoidable provider-dependent live canary remains `Bloqueado externo` with complete local contract, disabled-mode, negative, and simulation evidence.

## Project Structure

### Documentation (this feature)

```text
specs/002-complete-ui-modules/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-workspaces.md
│   ├── background-jobs.md
│   ├── provider-boundaries.md
│   └── acceptance-gates.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
server.js                         # route composition and request lifecycle
workspace.js                      # authenticated server-rendered workspaces
migrate.js                        # governed incremental schema evolution
authorization.js / rbac.js        # deny-by-default capabilities and object scope
route-capabilities.js             # route/method capability registry
tenant-context.js                 # mandatory tenant identity
outbox*.js / webhook*.js          # durable message pipelines

modules/
├── identity/                     # sessions, MFA, SSO, users, teams and roles
├── inbox/                        # assignment, routing, SLA, presence, notes and media
├── crm/                          # contact 360, consent, fields, merge, import/export
├── marketing/                    # segments, campaigns, eligibility and metrics
├── automation/                   # rule versions, engine, executions and integrations
├── knowledge/                    # articles, versions, ACL, indexing and retrieval
├── ai/                           # policies, redaction, evaluation, suggestions and tools
├── governance/                   # privacy, retention, suppliers and incidents
├── reporting/                    # metric definitions, reports, exports and alerts
└── operations/                   # jobs, DLQ recovery, release, backup and restore evidence

workers/
├── campaign-worker.js
├── automation-worker.js
├── integration-worker.js
├── privacy-worker.js
├── export-worker.js
└── indexing-worker.js

test/
├── unit and contract suites
├── postgres-*.test.js            # real database, concurrency and migration behavior
├── browser-*.test.js             # authenticated journey and accessibility acceptance
├── tenant-*.test.js              # BOLA/cross-tenant matrix
├── performance-*.test.js
├── resilience-*.test.js
├── privacy-*.test.js
└── ai-evaluation-*.test.js

scripts/
├── acceptance-gate.mjs
├── deploy-*.sh
├── validate-*.sh
├── backup-restore-drill.sh
└── rollback-drill.sh
```

**Structure Decision**: Keep the current root modules as stable entry points and introduce domain directories incrementally. Existing callers move behind explicit domain services without a big-bang framework rewrite. Each vertical slice owns persistence, policy, UI, jobs, and tests while shared HTTP, authorization, tenancy, audit, outbox, and operational primitives remain centralized.

## Delivery Strategy

### Wave 0 — Truth Baseline and Fail-Closed Harness

1. Reconcile the parity matrix with source, migrations, routes, live database, visible UI, and current tests.
2. Replace conditional or static evidence with a single acceptance manifest that names mandatory suites and fails on skips.
3. Establish per-row traceability: requirement, owner module, migration, route/action, job, test, live evidence, documentation state.
4. Freeze metric definitions, role/scope matrix, event vocabulary, idempotency keys, and provider-boundary contracts before feature code.

**Exit**: no unknown capability state; every open row has a testable owner and gate.

### Wave 1 — Identity, Authorization, Tenancy, and Audit Foundation

Implement object-scoped RBAC, granular roles, team/capacity lifecycle, admin MFA, external identity contract, immutable audit integrity, durable quotas, secret rotation, consistent security responses, and full cross-tenant harnesses.

**Exit**: every later module can rely on common deny-by-default identity, scope, audit, and secret primitives.

### Wave 2 — Messaging and Inbox Completion

Close provider contracts, durable inbound idempotency, recovery console, keyset pagination, full-text search, media, queue/unassigned views, transfer, routing, SLA/calendars, presence/collision, notes/macros, snooze/follow-up, and shared URL filters.

**Exit**: core shared-inbox journey passes local, real-database, browser, resilience, performance, and live data-plane gates.

### Wave 3 — Customer 360 and CRM Data Operations

Implement identity normalization, consent/suppression, typed custom fields, tag workflows, opportunities, external references, merge/deduplication, unified timeline, import, expiring export, and bounded bulk actions.

**Exit**: contact lifecycle and compliance eligibility are authoritative inputs to marketing and automation.

### Wave 4 — Segments and Campaigns

Build a typed segment expression model and safe evaluator, dynamic membership, preview, campaign lifecycle, recipient snapshot/recheck, scheduling, throttling, quotas, suppression, cancellation/kill switch, dispatch worker, and attribution metrics.

**Exit**: campaign acceptance proves zero ineligible recipients and idempotent dispatch.

### Wave 5 — Automation and Integrations

Implement versioned rules, dry-run, deterministic execution, schedules/timeouts, fallback/handoff, activation/rollback/kill switch, typed domain actions, provider adapters, sync/reconciliation, scoped external API/webhooks, circuit behavior, and payment-link boundary.

**Exit**: retried events cannot duplicate effects and provider faults remain recoverable and observable.

### Wave 6 — Knowledge and Optional AI

Implement article/version/ACL lifecycle, tenant-safe indexing and retrieval, feature flags, redaction, classifications, summaries, reply suggestions, citations, feedback, handoff packages, typed allowlisted tools, confirmation, audit, and pt-BR adversarial evaluation.

**Exit**: core knowledge works without AI; enabled AI passes leakage, PII, evidence, human-control, quality, and performance gates.

### Wave 7 — Privacy, Governance, Reports, and Observability

Complete privacy execution, retention/legal hold, supplier inventory, transfer records, incidents/escalation, published metric definitions, percentile reports, authorized exports, technical health, alerts, liveness/readiness split, and full correlation propagation.

**Exit**: legal and operational workflows are executable and reports reproduce fixed fixtures exactly.

### Wave 8 — Release Engineering and Final Closure

Govern migrations with locks/checksums, create reproducible release artifacts, run clean install and upgrade, complete security/accessibility/performance/resilience tests, perform encrypted off-host backup and isolated restore, deploy canary/in-place, rehearse rollback, independently validate live behavior, update every parity row and VM/project document.

**Exit**: all mandatory rows are `Completo`; externally blocked canaries meet the evidence rule; no mandatory suite is skipped; final live validation and rollback artifacts are current.

## Shared Design Rules

- Services receive `{tenantId, actor, authorization, correlationId}` explicitly; no default tenant fallback in business operations.
- Queries predicate tenant before object ID and return indistinguishable not-found/denied behavior where disclosure is unsafe.
- Mutations that enqueue work write domain state, audit, and job/outbox intent atomically.
- Every retriable job has a stable idempotency key, bounded lease, attempt history, cancellation state, and dead-letter/recovery path.
- User-facing asynchronous actions expose queued/running/succeeded/failed/cancelled states and actionable errors.
- HTML forms use CSRF protection; JSON/webhook contracts use the appropriate signed/scoped authentication and idempotency contract.
- Provider responses are normalized at adapter boundaries; secret-bearing requests reject unsafe resolution and redirects before transport.
- Sensitive downloads use authorization at generation and retrieval, expiry, audit, and non-guessable references.
- Metrics are computed from immutable/versioned definitions, not duplicated ad hoc queries.
- UI navigation is capability-derived. Hidden UI never substitutes for server-side authorization.

## Data and Migration Strategy

- Add bounded, versioned migrations rather than rewriting the database initializer.
- Backfill tenant and required columns before constraints; validate duplicate/conflict reports before uniqueness changes.
- Use tenant-qualified unique keys and foreign keys; prohibit cross-tenant references with service tests and database constraints where practical.
- Introduce append-only event/execution histories for consent, assignments, delivery, campaigns, automations, privacy, AI, incidents, and releases.
- Build indexes from observed query plans and SLO fixtures, including tenant-leading keyset and full-text access paths.
- Test every migration against both a fresh database and a representative pre-feature snapshot; record checksums and release compatibility.

## Test and Evidence Strategy

- **RED**: add the smallest failing behavioral test for each acceptance scenario and capture the expected failure.
- **GREEN**: implement the vertical behavior, including authorization, persistence, audit, UI, job, and failure state.
- **REAL DB**: exercise constraints, isolation, concurrency, idempotency, migration, search, and query plans in PostgreSQL.
- **BROWSER**: perform authenticated role-specific workflows and automated accessibility checks for every visible module.
- **ADVERSARIAL**: test BOLA, CSRF, SSRF/rebinding, secret leakage, malformed provider data, replay, race, quota, PII, and AI tool abuse.
- **RESILIENCE/LOAD**: inject database/provider/worker failures and measure the published service targets without silent loss.
- **REMOTE**: deploy through a named tmux session after backup; validate in a distinct named tmux session and perform a real data-plane canary outside the deployment session.
- **TRACEABILITY**: attach command, timestamp, release hash, exit status, and sanitized evidence to the parity row and docs.

## Risk Controls

- **Scope explosion**: deliver vertical waves with independently passing gates; never mark the complete feature done from partial wave success.
- **Large legacy entry point**: extract only through tested seams; no framework rewrite or unrelated refactor.
- **Migration risk**: backup, representative upgrade fixture, lock timeout, checksum, dry-run report, and rollback rehearsal.
- **Provider availability**: contract fake plus disabled mode and negative tests; classify only the live canary as externally blocked.
- **AI safety**: keep disabled by default, tenant-safe retrieval, pre-provider redaction, human confirmation, and fail-closed evaluation.
- **Metrics drift**: central versioned definitions and fixed fixture reconciliation.
- **False-green tests**: acceptance runner rejects skipped mandatory suites, missing environment, placeholder assertions, and stale evidence.

## Constitution Re-check After Design

- Test-first remains explicit in every wave and acceptance gate: **PASS**.
- Tenant identity, object scope, jobs, media, exports, retrieval, and AI are explicitly covered: **PASS**.
- Completion requires source, tests, live evidence, and documentation; externally blocked status is bounded: **PASS**.
- Deployment, backup, rollback, tmux, and independent validation are designed in: **PASS**.
- PostgreSQL remains canonical and core workflows have no provider dependency: **PASS**.

## Complexity Tracking

| Decision | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Incremental domain modules plus stable root entry points | Current root files are large and multiple new workers require ownership boundaries | Continuing all behavior in `server.js`/`workspace.js` would increase coupling and make independent tests and workers unsafe |
| Separate workers for campaign, automation, integration, privacy/export, and indexing jobs | These workloads need independent leases, retries, quotas, cancellation, and health | Running them in web requests or one undifferentiated loop would violate responsiveness and recovery requirements |
| Append-only histories plus current-state tables | Auditability, idempotency, metrics, rollback, and legal evidence require immutable transitions | Mutable state alone cannot reconstruct eligibility, attribution, or before/after evidence |
| Contract fake and optional live canary for external providers | Deterministic acceptance must run without production credentials while still proving real integration when available | Live-only tests are flaky and unsafe; mock-only tests cannot validate provider compatibility |

## Artifacts Produced by Planning

- `research.md`: current-state decisions, open parity categories, and chosen technical direction.
- `data-model.md`: aggregate boundaries, tenant keys, state machines, invariants, and migration order.
- `contracts/http-workspaces.md`: route/action behavior and authorization contract.
- `contracts/background-jobs.md`: durable job, lease, retry, cancellation, recovery, and idempotency contract.
- `contracts/provider-boundaries.md`: messaging, identity, integration, and AI adapter safety contract.
- `contracts/acceptance-gates.md`: mandatory evidence classes and fail-closed release manifest.
- `quickstart.md`: deterministic local validation order and remote evidence workflow.
