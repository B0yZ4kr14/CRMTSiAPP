# Feature Specification: Runtime-aligned UI, navigation and documented parity

**Feature Branch**: `001-runtime-ui-parity`
**Created**: 2026-09-18
**Status**: In progress
**Input**: Reconcile the real CRMTSiAPP deployment at `vpstsiapp:/opt/tsi-stack/apps/crm/crmtsiapp/` with `CRMTSiAPP_Self-Hosted.md`; eliminate broken navigation and static placeholder claims; execute autonomous phases with evidence and update documentation.

## Scope and Truth Model

The live PostgreSQL runtime, browser-observed authenticated experience, committed source, and timestamped remote tmux evidence are the facts of record. A menu or static HTML does not establish feature completion. A capability is `Complete` only when its persistence, authorization, tested workflow and live acceptance evidence exist.

## User Scenarios & Testing

### User Story 1 - Navigate every available workspace without a server error (Priority: P1)

As an authenticated operator, I can open every primary navigation item and every settings section that the UI advertises. Each page returns a rendered workspace appropriate to the current user's authorization; none produces an error page, 404, or a link to an unimplemented endpoint.

**Why this priority**: Browser evidence shows every `/settings/*` entry is broken: `/settings/start`, `/settings/channels` and `/settings/team` return 500, while `/settings/queues` and other advertised pages return 404.

**Independent Test**: An authenticated browser route sweep receives 200 and the intended page title for every advertised route; backend integration tests exercise the same route set against PostgreSQL.

**Acceptance Scenarios**:

1. Given an authenticated administrator, when opening every visible primary and settings navigation route, then each receives HTTP 200 with its expected workspace title and no generic error page.
2. Given an authenticated role without a required permission, when opening a restricted route, then it receives a deliberate 403/redirect instead of a 500.
3. Given an empty tenant, when viewing a supported workspace, then it sees an actionable empty state and never a misleading completion claim.

---

### User Story 2 - Use real, tenant-scoped operational settings (Priority: P1)

As an administrator, I can manage channels, teams, queues, templates, automation rules and privacy requests through persisted, tenant-scoped server workflows. Their UI only renders fields that are supported by the migrated schema and their lists reflect saved data.

**Why this priority**: The real database has schema drift: `channels.validation_state`, `automation_rules.trigger`, and `privacy_requests.type` are queried by the UI/backend but do not exist. This is the direct cause of the broken settings pages.

**Independent Test**: A clean-database migration and PostgreSQL integration flow creates one entity of each supported kind, reloads its workspace, and verifies tenant isolation.

**Acceptance Scenarios**:

1. Given a migrated database, when loading settings, then all queries reference columns guaranteed by migration.
2. Given two tenants, when tenant A creates or lists an entity, then tenant B cannot read or mutate it.
3. Given a privacy request or automation rule is recorded, when the administrator reloads its workspace, then the persisted record and audit event are visible.

---

### User Story 3 - Receive an honest feature-to-runtime parity report (Priority: P2)

As the operator, I can read one consolidated report identifying for every P0/P1 capability whether it is executable, partial, absent, or externally blocked, with source, test and live-evidence references.

**Why this priority**: Existing documentation contradicts itself: task plan marks phases complete while parity matrix still lists most requirements as partial or absent.

**Independent Test**: Documentation review verifies every `Complete` row has direct implementation, automated-test and timestamped runtime-evidence references; all other items retain their true status.

**Acceptance Scenarios**:

1. Given a requirement marked Complete, when its evidence is checked, then source, automated test and remote evidence are all present.
2. Given a not-yet-built feature, when the report is read, then it is marked Partial, Absent or Blocked—not Complete.

## Requirements

- FR-001: The product MUST not display a link to a route absent from the server route allowlist.
- FR-002: All advertised settings routes MUST have a valid renderer and data access compatible with the current schema.
- FR-003: Migrations MUST add all columns used by settings reads/writes idempotently and preserve existing data.
- FR-004: Settings queries and mutations MUST be tenant-scoped and authorized.
- FR-005: The test suite MUST include authenticated route sweep coverage and PostgreSQL-real schema/workflow coverage for each completed settings vertical.
- FR-006: UI tests MUST classify placeholder modules as incomplete rather than passing merely because a menu link exists.
- FR-007: Documentation MUST state the observed runtime status and preserve unimplemented P0/P1/P2 items as open work.
- FR-008: Every remote mutation and validation MUST run in named idempotent tmux sessions with private logs and separate exit files; success requires independent second-session validation.

## Non-Goals

- This feature does not falsely claim implementation of MFA, SSO/SAML, full RAG, autonomous AI, analytics, or marketplace capabilities already marked absent in the parity matrix.
- This feature does not replace the existing deployment tree or introduce Supabase.

## Success Criteria

- SC-001: 100% of visible navigation routes succeed or are intentionally hidden by authorization; zero generic error pages in the authenticated route sweep.
- SC-002: Zero settings queries fail due to missing columns in a clean migration or live compatibility audit.
- SC-003: Completed settings flows have PostgreSQL-real behavioral tests, cross-tenant tests and live browser evidence.
- SC-004: The parity matrix and operational documentation agree with current runtime evidence and contain no unsupported completion claim.
