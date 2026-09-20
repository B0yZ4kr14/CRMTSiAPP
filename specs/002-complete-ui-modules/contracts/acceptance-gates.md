# Acceptance Gate Contract

**Feature**: `002-complete-ui-modules`

## Fail-Closed Rule

The release gate succeeds only when every mandatory suite is discovered, executed, reports zero skipped/cancelled/todo tests, exits zero, and produces current evidence for the candidate release hash. Missing environment, database, browser, fixture, command, report, or credential does not turn a mandatory suite into a pass.

A provider live canary may be `Bloqueado externo` only when its deterministic contract, disabled mode, negative security tests, local simulation, and all provider-independent workflows pass. The gate records the exact missing external prerequisite.

## Mandatory Manifest

The implementation must provide a versioned manifest consumed by `scripts/acceptance-gate.mjs`. Each entry contains:

- Stable suite ID and normative requirement/parity IDs.
- Command and working directory.
- Required environment names without values.
- Maximum duration.
- Evidence output path and schema/version.
- Minimum test/assertion count when deterministic.
- Whether external blocking is permitted and under what precise condition.
- Candidate release hash and evidence timestamp.

The runner rejects unknown skipped tests, empty suites, source-text-only assertions for behavioral requirements, stale evidence, mismatched release hashes, duplicate suite IDs, and a manifest that omits an open normative row.

## Mandatory Evidence Classes

### G01 — Static Integrity

- Syntax/import checks for application, workers, migrations, and scripts.
- Dependency lock consistency.
- `git diff --check`.
- Secret scan covering source, generated artifacts, logs, and fixtures.
- Dependency audit and software-bill-of-materials generation.
- No Supabase application dependency or runtime reference.

### G02 — Unit and Domain Behavior

- Validators and normalizers.
- State machines and transition denial.
- RBAC resource/action/scope decisions.
- Segment compiler and automation condition/action evaluation.
- Metric definitions and percentile calculations.
- Redaction, provider normalization, and disabled states.

### G03 — HTTP and Contract Behavior

- Route/method capability registry covers every authenticated action.
- Session, CSRF, webhook signature/replay, API scope, validation, errors, pagination, exports, and idempotency contracts.
- Every visible route and primary action has a behavioral assertion.
- Uniform security headers for HTML and JSON responses.

### G04 — PostgreSQL-Real

Mandatory isolated PostgreSQL execution covers:

- Fresh install and representative in-place upgrade.
- Migration lock, checksum, rerun, interruption, and incompatibility behavior.
- Constraints, tenant-qualified uniqueness, foreign keys, and deletion rules.
- Transactions joining domain state, audit, and job/outbox intent.
- Tenant isolation/BOLA for IDs, search, exports, attachments, jobs, campaigns, knowledge, AI context, and recovery.
- At least 100 repeated/concurrent attempts for each idempotent critical workflow.
- Keyset pagination and full-text search correctness under concurrent writes.
- Lease fencing, retry, cancellation, dead-letter, and recovery.
- Query plans and representative dataset performance.

`TEST_DATABASE_URL` or an approved isolated-database provisioning mechanism is required. Absence fails the gate.

### G05 — Authenticated Browser and Accessibility

For every role:

- Open each visible primary/settings workspace.
- Complete the principal persisted workflow and verify after reload.
- Verify direct unauthorized route/action denial.
- Exercise empty, validation, loading/queued, success, failure, disabled-provider, and recovery states.
- Run keyboard, focus, label/name, heading, contrast, and responsive-layout checks.
- Assert zero unexpected console errors, network 4xx/5xx, dead controls, placeholders, or hardcoded success metrics.

### G06 — Messaging and Provider Contracts

- Deterministic fake covers inbound/outbound/status/media, duplicate/reordered events, rate limits, timeout, malformed response, authentication failure, retries, and recovery.
- Service-window, template, consent, suppression, quota, and recipient eligibility gates.
- DNS/rebinding, redirect, request-forgery, and credential-leak negative tests.
- Correlation from webhook through worker/provider/status.
- Live canary when a safe configured sandbox exists.

### G07 — Security and Privacy

- Admin MFA enrollment/challenge/recovery/revocation.
- Granular role and object-scope matrix.
- Session rotation/revocation and privilege-change handling.
- CSRF, injection, replay, BOLA, SSRF/rebinding, upload, export-expiry, quota, and secret-rotation tests.
- Privacy access/export/anonymize/delete and legal-hold conflict.
- Retention dry-run and purge.
- Audit integrity verification.
- Static, dependency, dynamic, and secret scans contain no unresolved critical/high finding.

### G08 — Campaign, Automation, and Integration

- Segment preview equals dispatch evaluator.
- Zero ineligible campaign recipient; cancellation/kill switch prevents new scheduling.
- Campaign outcomes reconcile to recipient attempts.
- Automation dry-run has no effect; replay does not duplicate effects; activation, rollback, and kill switch work.
- Integration timeout, conflict, circuit, retry, dead-letter, and reconciliation behavior.

### G09 — Knowledge and AI

- Article/version/ACL/search/retrieval works without AI.
- Cross-tenant and stale/restricted knowledge never appears.
- Feature flags and disabled mode.
- pt-BR adversarial corpus for PII, prompt injection, unsupported claims, unsafe tools, ungrounded output, and timeouts.
- Zero prohibited PII transmission, zero cross-tenant retrieval, and zero unconfirmed irreversible action.
- Human accept/edit/reject and evidence/audit metadata.
- Optional live provider canary under the external-blocking rule.

### G10 — Reports and Observability

- Fixed timestamped fixtures reproduce displayed counts and p50/p90/p95 exactly.
- UI and exported report use the same filters/definition versions.
- Liveness and readiness are distinct.
- Worker backlog/age, attempts, dead letters, heartbeat, database/provider state, release identity, and alerts are verified.
- Trace/correlation propagation spans HTTP, jobs, workers, and provider attempts without sensitive payloads.

### G11 — Performance and Resilience

Representative documented workload proves:

- Webhook acknowledgement p95 < 500 ms.
- Inbox interactions p95 < 500 ms.
- Search p95 < 1 s.
- No silent loss under provider/database delay, malformed responses, worker termination, lease expiry, retry storm, and quota pressure.
- Backpressure preserves accepted work and provides observable recovery.

### G12 — Release, Restore, and Rollback

- Reproducible release artifact and manifest hashes.
- Clean install and upgrade from representative prior snapshot.
- Pre-deployment backup.
- Encrypted off-host backup evidence.
- Isolated restore timed to RPO <= 15 minutes and RTO <= 60 minutes.
- Atomic activation and rollback rehearsal.
- Deployment in named tmux and independent validation in a second named tmux session.
- Final data-plane canary validates real persistence, worker processing, tenant isolation, and release identity.
- Project and VM documentation matches observed runtime.

## Required Summary

The gate emits one bounded JSON and one human-readable report containing:

- Candidate release and source hash.
- Start/end timestamps.
- Every suite ID, requirement IDs, command identity, test/pass/fail/skip counts, exit status, duration, and evidence path.
- External blockers and exact prerequisites.
- Security findings by severity.
- Performance percentiles and workload definition.
- Backup, restore, deployment, validation, and rollback artifact identifiers.
- Final state: `PASS` or `FAIL`.

No secret, token, password, private key, credential-bearing URL, raw personal-data corpus, or unredacted provider body is permitted in the report.

## Parity Transition Rule

A row in `docs/CRMTSIAPP-SELF-HOSTED-PARITY-MATRIX.md` moves to `Completo` only when:

1. Its implementation exists and is reachable through the authorized workflow.
2. All mapped mandatory evidence classes pass for the same release.
3. PostgreSQL-real and browser evidence applies when the behavior persists or is user-facing.
4. Live runtime evidence exists after deployment.
5. Documentation and operational recovery are current.

If any condition fails, the row remains `Parcial` or `Ausente`. `Bloqueado externo` is limited to the live third-party canary as defined above.
