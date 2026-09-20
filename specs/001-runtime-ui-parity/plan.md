# Implementation Plan: Runtime-aligned UI, navigation and documented parity

**Branch**: `001-runtime-ui-parity` | **Date**: 2026-09-18 | **Spec**: `specs/001-runtime-ui-parity/spec.md`

## Summary

Repair the currently broken authenticated settings navigation, whose source queries schema columns absent in the live PostgreSQL deployment. Establish a testable migration/schema contract, then render and persist only real tenant-scoped operational settings. Audit all UI modules against the normative self-hosted specification and update parity documentation to distinguish executable features from placeholders.

## Technical Context

**Language/Version**: Node.js >=22, CommonJS
**Dependencies**: `pg`, `undici`, built-in `node:test`
**Storage**: PostgreSQL 17.11 on vpstsiapp
**Testing**: `node --test`; PostgreSQL-real test suites using `TEST_DATABASE_URL`/`TEST_DATABASE_ADMIN_URL`
**Target Platform**: Debian 13 `vpstsiapp`, systemd services listening on `172.20.0.1:3101`, published at `https://crm.tsiapp.io`
**Project Type**: Server-rendered web application + durable workers
**Constraints**: Existing `/opt/tsi-stack/apps/crm/crmtsiapp/` is the only target; no Supabase; all remote commands must run in named idempotent tmux sessions with private logs and separate exit files.

## Constitution Check

- Test-first: write a behavioral red test before every source/migration change.
- Evidence-first: only mark capability Complete after source, test, PostgreSQL-real validation and independent browser/runtime validation.
- Tenant isolation: every new read/write predicates active tenant identity and receives an authorization decision.
- Reversibility: remote deployment takes timestamped backup before changes.

## Root-Cause Evidence

Remote tmux diagnosis on 2026-09-18 observed:

- `teams` query: OK
- `channels` query: `42703 column "validation_state" does not exist`
- `queues` query: OK
- `templates` query: OK
- `automation_rules` query: `42703 column "trigger" does not exist`
- `privacy_requests` query: `42703 column "type" does not exist`
- `audit_events` query: OK

The existing `renderSettings` unconditionally runs all settings queries for every route. Therefore even `/settings/start` errors when any unrelated query has schema drift. The browser route sweep confirmed 500 responses for start/channels/team and 404 responses for queues and other advertised settings routes.

## Design

### Phase 0 — Runtime evidence and UI inventory

1. Maintain a browser authenticated route-sweep test that visits every visible primary navigation and settings link.
2. Maintain a remote tmux diagnostic script that records service status, health, schema compatibility, route sweep result, logs and exit code.
3. Create a source-to-spec mapping in the parity matrix that marks all placeholders Partial or Absent.

### Phase 1 — Schema and settings boundary

1. Build a schema compatibility contract test from actual settings query columns.
2. Extend `tenantMigration()` with idempotent additive migrations for every field actually used by completed settings flows, or reduce source queries to canonical existing fields after live introspection.
3. Refactor `renderSettings` to fetch only data required by the selected section. This prevents unrelated schema failures from breaking Workspace and allows each surface to fail independently with controlled diagnostics.
4. Use `audit_events` as the audit source, not a nonexistent `audit_logs` table. Privacy requests must use the actual `privacy_requests` columns after introspection.

### Phase 2 — User stories

- US1: Route allowlist, renderer and browser sweep.
- US2: Channels, teams, queues, templates, automation, privacy flows using actual migrated columns and tenant-scoped persistence.
- US3: Dashboard and reports receive live computed query data; IA and other unbuilt surfaces stay explicitly Partial in docs until functioning.

### Phase 3 — Verification and delivery

1. Execute unit/contract suite, PostgreSQL-real migration/workflow suite and static `git diff --check`.
2. Deploy archive in `tsi-crm-ui-parity-deploy`; retain private log and exit file.
3. Validate in a distinct `tsi-crm-ui-parity-validate` session, including service status, health and browser route sweep.
4. Update `docs/CRMTSIAPP-SELF-HOSTED-PARITY-MATRIX.md`, `docs/CRMTSIAPP-RUNTIME-RECONCILIATION-2026-09-18.md`, `task_plan.md` and `progress.md` with observed—not assumed—state.

## Data Model / Contracts

- `automation_rules`: inspect real columns before deciding whether to add `trigger` or map to its canonical existing representation. All reads/writes include `tenant_id`.
- `privacy_requests`: inspect real columns before deciding whether to add `type` or map to canonical `request_type`; all requests include `tenant_id`.
- `audit_events`: canonical audit table; filter by `tenant_id`, order by `created_at`, never expose sensitive payloads without role authorization.
- `channels`: validate the canonical health/status source (`channel_credentials.validation_state` is already used by `listChannels`), and remove invalid `channels.validation_state` reads.

## Documentation Layout

```text
specs/001-runtime-ui-parity/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
└── checklists/
    └── requirements.md

docs/
├── CRMTSIAPP-SELF-HOSTED-PARITY-MATRIX.md
└── CRMTSIAPP-RUNTIME-RECONCILIATION-2026-09-18.md
```

## Risks and Mitigations

- Existing schema differs from source: use introspection and idempotent migrations; test upgraded and fresh databases.
- Browser session can expire: route sweep detects redirects/login rather than treating it as a 500.
- Provider/model unavailable for visual analysis: browser DOM route sweep and server evidence remain the deterministic acceptance path.
- Large scope: deliver P0/P1 verticals in independent, tested phases and never convert absent P2 work into a completion claim.
