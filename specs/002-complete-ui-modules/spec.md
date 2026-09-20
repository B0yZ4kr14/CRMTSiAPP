# Feature Specification: Complete UI Modules

**Feature Branch**: `002-complete-ui-modules`

**Created**: 2026-09-19

**Status**: Draft

**Input**: User description: "Módulos não estão funcionais e o produto ainda não cobre todas as features e módulos; prosseguir autonomamente até finalizar todo o sistema descrito em CRMTSiAPP_Self-Hosted.md."

## Scope and Truth Model

This feature closes every `Parcial`, `Ausente`, or otherwise open capability in `docs/CRMTSIAPP-SELF-HOSTED-PARITY-MATRIX.md`. `CRMTSiAPP_Self-Hosted.md` is the normative product contract. A capability is complete only when a user can execute the workflow through an authorized interface, its state is persisted and tenant-isolated, failure and recovery paths are observable, automated acceptance coverage passes, and the deployed runtime has independent evidence. Navigation-only pages, schemas without workflows, hardcoded metrics, conditional tests that skip required behavior, and documentation claims are not completion.

Optional provider-dependent capabilities must remain disabled safely when not configured and must expose their exact operational status. Lack of external credentials may block a provider canary, but it must not block complete local contracts, simulations, negative tests, or the rest of the product.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operate Every Advertised Workspace (Priority: P1)

As an authenticated user, I can navigate every module and settings area available to my role and complete its primary workflow without errors, dead ends, fake controls, or placeholder content.

**Why this priority**: A visible but nonfunctional module prevents normal operations and misrepresents product capability.

**Independent Test**: An authenticated route-and-action sweep for each role opens every visible workspace, submits its principal form or action, reloads the result from persisted state, and encounters no unexpected error or placeholder.

**Acceptance Scenarios**:

1. **Given** a user with an allowed role, **When** the user follows every visible navigation entry and completes the page's primary action, **Then** each workflow succeeds or returns a clear, actionable validation error and its persisted outcome survives reload.
2. **Given** a user without permission, **When** the user requests a hidden route or mutation directly, **Then** access is denied without disclosing cross-role or cross-tenant data.
3. **Given** an optional capability without a configured provider, **When** its workspace is opened, **Then** the user sees an accurate disabled state and setup requirements rather than a false success or broken action.

---

### User Story 2 - Run Inbox and Messaging Operations Reliably (Priority: P1)

As an agent or supervisor, I can find, assign, transfer, answer, annotate, snooze, close, reopen, and recover conversations while honoring queues, service windows, templates, attachments, retries, and concurrent work.

**Why this priority**: Messaging and shared-inbox operation are the product's core business path.

**Independent Test**: A tenant-scoped conversation fixture exercises inbound ingestion, assignment and transfer, concurrent agent access, outbound text/template/media, delivery updates, retry/recovery, SLA state, and close/reopen without duplicate effects.

**Acceptance Scenarios**:

1. **Given** a new inbound message delivered more than once, **When** ingestion runs concurrently, **Then** one durable business effect is created and the sender receives a timely acknowledgement.
2. **Given** two agents viewing one conversation, **When** both attempt conflicting actions, **Then** both see presence or collision feedback and no update is silently lost.
3. **Given** an outbound failure or exhausted retry, **When** an authorized operator uses recovery controls, **Then** retry, cancellation, reconciliation, and dead-letter outcomes are idempotent and audited.

---

### User Story 3 - Manage Customers and Sales Context End to End (Priority: P1)

As an authorized sales or support user, I can maintain a complete customer record containing normalized identity, ownership, lifecycle, consent, tags, custom fields, opportunities, external references, and a unified timeline; I can import, export, merge, and update records in bulk safely.

**Why this priority**: Messaging without reliable customer context, consent, and lifecycle history is not a functional CRM.

**Independent Test**: Create two possible duplicate contacts, record consent and opt-out, add typed fields and an opportunity, import additional rows, merge with preview, execute a privileged export, and verify the unified tenant-scoped timeline.

**Acceptance Scenarios**:

1. **Given** duplicate identities in one tenant, **When** an authorized user previews and confirms a merge, **Then** references are preserved transactionally and the before/after trail is auditable.
2. **Given** a contact has opted out, **When** any campaign or non-permitted outbound path evaluates that contact, **Then** delivery is suppressed immediately.
3. **Given** an import containing valid, duplicate, and invalid rows, **When** it completes, **Then** the user receives counts and row-level errors without partial silent corruption.

---

### User Story 4 - Build Segments and Execute Governed Campaigns (Priority: P1)

As a marketing user, I can create previewable dynamic segments and schedule campaigns using approved templates, while eligibility, suppression, quotas, cancellation, and metrics are enforced.

**Why this priority**: Segments and campaigns are currently advertised but do not provide executable business workflows.

**Independent Test**: Build an AND/OR segment with exclusions, preview its membership, schedule a campaign, run dispatch against eligible and ineligible contacts, stop it with the kill switch, and reconcile sent, delivered, read, failed, and opt-out metrics.

**Acceptance Scenarios**:

1. **Given** structured segment criteria, **When** the user previews the segment, **Then** the displayed count and sample match the tenant's eligible contacts and update when source data changes.
2. **Given** a scheduled campaign, **When** dispatch starts, **Then** only eligible recipients receive the approved template within applicable limits.
3. **Given** an active campaign, **When** an authorized user cancels it, **Then** no new recipient is scheduled and already attempted outcomes remain visible and auditable.

---

### User Story 5 - Configure and Run Automations and Integrations (Priority: P1)

As an administrator, I can create versioned trigger-condition-action automations, dry-run and activate them, inspect executions, disable them instantly, and connect external systems through scoped, observable integration contracts.

**Why this priority**: Persisted rules and integration configuration without an execution engine do not automate work.

**Independent Test**: Define a rule, run a dry-run fixture, activate it, trigger it twice, verify idempotent actions and history, roll back its version, then inject timeout and provider errors and reconcile the integration state.

**Acceptance Scenarios**:

1. **Given** a draft rule, **When** dry-run executes, **Then** the user sees matched conditions and proposed actions with no external side effect.
2. **Given** an active rule receiving a retried event, **When** it executes again, **Then** irreversible effects are not duplicated.
3. **Given** a failing external system, **When** retry limits are reached, **Then** the failure is visible, recoverable, correlated, and does not expose credentials.

---

### User Story 6 - Use Knowledge and AI with Human Control (Priority: P2)

As an authorized agent or knowledge owner, I can maintain versioned knowledge articles and use tenant-safe AI assistance for classification, summaries, suggested replies, retrieval, and handoff, with evidence, feedback, redaction, and human approval.

**Why this priority**: AI can accelerate operations only after core CRM workflows are correct and only with measurable safety and provenance.

**Independent Test**: Publish two knowledge versions with access controls, retrieve tenant-specific citations, generate a redacted summary and reply suggestion, accept/edit/reject suggestions, perform an allowed tool action with confirmation, and verify audit and evaluation records.

**Acceptance Scenarios**:

1. **Given** knowledge belonging to different tenants or restricted teams, **When** retrieval runs, **Then** only authorized current content is returned with references.
2. **Given** content containing protected personal data, **When** an external model is used, **Then** disallowed data is removed before transmission and the model, policy, evidence, and cost metadata are recorded without chain-of-thought.
3. **Given** an irreversible proposed action, **When** the user has not explicitly confirmed it, **Then** no side effect occurs.

---

### User Story 7 - Govern Privacy, Security, and Identity (Priority: P1)

As an administrator, auditor, or privacy operator, I can manage granular roles, MFA, external identity, secrets, privacy requests, retention, suppliers, incidents, and immutable audit evidence without weakening tenant boundaries.

**Why this priority**: These controls protect customer data and are mandatory for safe operation and LGPD accountability.

**Independent Test**: Exercise administrator MFA enrollment and recovery, role/object-scope denial, a privacy access/export/anonymization workflow, retention dry-run and purge, secret rotation, incident escalation, and audit integrity checks.

**Acceptance Scenarios**:

1. **Given** an administrator without a valid second factor, **When** a protected session or action is attempted, **Then** access is denied and recovery follows a controlled, audited path.
2. **Given** a verified privacy request, **When** authorized processing completes, **Then** the outcome covers relevant systems, expires safely where applicable, and preserves required legal evidence.
3. **Given** a secret-bearing provider endpoint with unsafe name resolution or redirect behavior, **When** connection is attempted, **Then** no credential is transmitted.

---

### User Story 8 - Measure Operations with Real Reports (Priority: P1)

As a manager, I can filter dashboards and reports by period, queue, team, channel, and category; inspect defined operational percentiles and outcomes; export authorized results; and distinguish application, queue, database, and provider health.

**Why this priority**: Hardcoded or undefined metrics cannot support staffing, service quality, or incident response.

**Independent Test**: Load a timestamped fixture with known outcomes and verify backlog, unassigned, first-response, resolution, SLA, reopen, transfer, delivery, opt-out, campaign, automation, AI/handoff, worker, and system-health measures and exports.

**Acceptance Scenarios**:

1. **Given** a fixed event dataset, **When** filters change, **Then** displayed counts and p50/p90/p95 values match the published definitions.
2. **Given** a degraded worker or provider, **When** health is inspected, **Then** liveness, readiness, backlog age, retries, dead letters, and correlation identifiers expose the correct state.
3. **Given** an authorized report export, **When** generation completes, **Then** the result is tenant-scoped, expiring, audited, and contains the same filtered definitions shown in the interface.

---

### User Story 9 - Deploy, Recover, and Prove the Complete Product (Priority: P1)

As an operator, I can migrate, deploy, roll back, restore, load-test, and validate the system using reproducible artifacts and fail-closed gates, without losing accepted data or relying on skipped critical tests.

**Why this priority**: A feature is not complete until its deployed behavior and recovery are proven.

**Independent Test**: Start from a clean supported database, apply migrations, run unit/contract/database/browser/security/resilience/load suites, deploy a versioned artifact, restore a backup to an isolated target, execute a rollback rehearsal, and independently validate the live runtime.

**Acceptance Scenarios**:

1. **Given** a clean supported environment, **When** installation and migration complete, **Then** every required workflow is available without manual schema repair.
2. **Given** a failed release validation, **When** rollback runs, **Then** the prior healthy version and accepted data are restored within the documented recovery objective.
3. **Given** final validation, **When** any required test is skipped, placeholder behavior is found, or evidence is stale, **Then** the completion gate fails.

## Edge Cases

- A tenant has no users, queues, channels, contacts, templates, or providers configured.
- Two tenants use the same phone number, external identifier, tag name, custom-field name, or provider reference.
- The same inbound event, campaign dispatch, automation event, import job, privacy job, or recovery command is delivered concurrently or after a crash.
- A user's role, team, object ownership, or session is revoked while a form, export, automation, or AI action is in progress.
- Timezones, daylight-saving transitions, holidays, service windows, and scheduled jobs cross date boundaries.
- A template becomes unapproved, a contact opts out, or campaign eligibility changes after scheduling but before dispatch.
- Attachments exceed limits, have mismatched types, contain malware, or become unavailable after metadata persistence.
- Import and export jobs contain malformed encodings, formulas, duplicates, partial rows, or more records than interactive limits.
- Search, reports, and pagination operate while records are inserted, merged, deleted, or reassigned.
- External providers time out, redirect, rate-limit, return malformed data, rotate credentials, or recover after circuit opening.
- AI is disabled, unavailable, too slow, returns unsupported claims, attempts cross-tenant retrieval, or proposes an unauthorized tool action.
- Privacy deletion conflicts with legal hold, immutable audit evidence, active financial references, or an in-progress export.
- Backups are incomplete, migrations are interrupted, or the running release does not match the documented artifact hash.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an executable, tenant-scoped primary workflow for every capability listed in the normative parity matrix; no visible module may remain a placeholder, dead link, schema-only claim, or hardcoded simulation.
- **FR-002**: The system MUST apply deny-by-default authorization using resource, action, tenant, team, object ownership, and operational scope for all reads, writes, jobs, exports, recovery actions, and AI tools.
- **FR-003**: The system MUST support granular operational roles for agent, supervisor, manager, marketing, administrator, auditor/privacy officer, and developer/integration operator without broad implicit privilege.
- **FR-004**: The system MUST provide secure session lifecycle controls, mandatory administrator MFA, recovery controls, and configurable external identity through a standard identity contract; unavailable enterprise-only variants MUST be labeled accurately.
- **FR-005**: The system MUST support team membership, capacity, availability, activation, queue membership, and auditable lifecycle management.
- **FR-006**: The system MUST ingest provider webhooks durably and idempotently, acknowledge within the defined service target, and preserve a correlated event trail through outbound delivery.
- **FR-007**: The system MUST provide independent message workers with bounded retry, backoff, lease fencing, dead-letter handling, reconciliation, and an authorized recovery console.
- **FR-008**: The system MUST enforce the conversation service window, approved templates, consent, suppression, and provider policy before every outbound attempt.
- **FR-009**: The system MUST support tenant-safe attachments with validation, malware disposition, expiring access, retention, and outbound delivery status.
- **FR-010**: The system MUST provide stable keyset pagination and tenant-safe full-text search for conversations, messages, contacts, and knowledge content.
- **FR-011**: The Inbox MUST support queue, unassigned, mine, all, closed, SLA, snoozed, and follow-up views with shareable filters.
- **FR-012**: The Inbox MUST support assignment, transfer with reason, history, automated distribution, presence/collision handling, internal notes, macros, attachments, close/reopen, snooze, and follow-up.
- **FR-013**: Contact records MUST support normalized identity, ownership, team, lifecycle, lead source, language, timezone, typed custom fields, tags, consent evidence, and immediate opt-out suppression.
- **FR-014**: The CRM MUST provide opportunities, configurable stages and values, and read-only linked business references for orders, tickets, payments, and other external records.
- **FR-015**: The CRM MUST provide previewable merge/deduplication, unified paginated timeline, CSV import with row-level results, privileged expiring export, and bounded bulk actions.
- **FR-016**: Segments MUST support nested structured AND/OR criteria, exclusions, live preview, dynamic recomputation, deterministic eligibility, and tenant isolation.
- **FR-017**: Campaigns MUST support approved template selection, segment targeting, scheduling, quotas, throttling, suppression, cancellation, kill switch, idempotent dispatch, and outcome attribution.
- **FR-018**: Automation MUST support versioned trigger-condition-action rules, schedules, timeouts, dry-run, activation, rollback, history, fallback, handoff, kill switch, and idempotent effects.
- **FR-019**: Integrations MUST use scoped provider contracts for customer, order, ticket, payment, catalog, calendar, and identity data; sync MUST expose external identifiers, versions, status, errors, retry, conflict, and reconciliation.
- **FR-020**: External APIs and webhooks MUST use scoped credentials or signatures, bounded timeouts, idempotency, rate limits, retries, dead-letter handling, correlation, and real documentation.
- **FR-021**: Knowledge management MUST support versioning, owner, validity, access control, ingestion, update, search, citation, and tenant-safe retrieval.
- **FR-022**: AI capabilities MUST be feature-flagged and optional and MUST support controlled classification, summary, response suggestion, grounded retrieval, and handoff with human accept/edit/reject feedback.
- **FR-023**: AI MUST redact prohibited personal data before external processing, restrict tools through typed allowlists and domain authorization, require confirmation for irreversible actions, and audit model, prompt/policy version, evidence, outcome, latency, and cost without recording chain-of-thought.
- **FR-024**: The system MUST include offline and adversarial Portuguese evaluation for AI quality, groundedness, cross-tenant leakage, unsafe actions, and performance before an AI capability is enabled broadly.
- **FR-025**: Privacy operations MUST provide verified data-subject lookup, purpose and evidence inventory, access, expiring export, anonymization, deletion, retention dry-run/purge, legal-hold handling, and complete audit history.
- **FR-026**: Governance MUST maintain suppliers/subprocessors, data categories, countries and transfer mechanisms, retention, incidents, severity, owners, deadlines, and escalation evidence.
- **FR-027**: Audit evidence MUST be append-only and integrity-checkable and include tenant, actor, action, resource, before/after or reason, network context, correlation, timestamp, and outcome.
- **FR-028**: Secrets MUST be encrypted, versioned, rotatable, never redisplayed, and protected from unsafe resolution, redirects, request forgery, logs, exports, and error messages.
- **FR-029**: The system MUST apply durable quotas and rate limits by tenant, account, operation, and network where applicable and return consistent security headers for all public responses.
- **FR-030**: Dashboards and reports MUST derive published definitions from persisted events and support period, business unit, queue, team, channel, and category dimensions plus authorized expiring exports.
- **FR-031**: Operational metrics MUST include backlog, unassigned, first response, resolution, SLA, reopen, transfer, satisfaction, opt-out, delivery, campaign, bot, handoff, AI, and automation outcomes with defined denominators and p50/p90/p95 where meaningful.
- **FR-032**: Technical observability MUST distinguish liveness and readiness and expose queue backlog and age, retries, dead letters, worker heartbeat, database/provider state, release identity, and end-to-end correlation without sensitive payloads.
- **FR-033**: Migration and deployment MUST be incremental, lock-safe, checksum-governed, repeatable from a clean database, use a versioned reproducible artifact, support atomic rollback, and preserve in-place upgrade compatibility.
- **FR-034**: Backup and restore MUST meet documented recovery objectives using encrypted off-host copies and a timed isolated restore rehearsal.
- **FR-035**: The acceptance gate MUST execute unit, real-database, contract, webhook, queue, browser, cross-tenant/BOLA, accessibility, security, resilience, performance, privacy, AI, migration, restore, deployment, and rollback validation; a skipped required suite MUST fail the gate.
- **FR-036**: Product and operational documentation MUST reflect observed behavior, capability status, metric definitions, provider prerequisites, recovery procedures, release identity, and remaining externally blocked evidence.

### Key Entities

- **Tenant/Workspace**: Isolation boundary, plan, locale, timezone, quotas, and feature policy.
- **User, Role, Team, Membership, Session, MFA Factor**: Identity, availability, capacity, scope, authentication, and revocation state.
- **Channel and Provider Credential**: Messaging endpoint, policy, encrypted secret version, health, and rate state.
- **Contact, Identity, Consent, Suppression, Custom Field, Tag**: Customer 360 identity and communication eligibility.
- **Conversation, Assignment, Presence, Note, Message, Attachment, Delivery Attempt**: Shared-inbox state and complete communication history.
- **Queue, Routing Rule, SLA Policy, Business Calendar, Follow-up**: Work distribution and service commitments.
- **Opportunity and External Record Reference**: Sales lifecycle and linked order, ticket, payment, or business context.
- **Import, Export, Merge, Bulk Job**: Bounded asynchronous CRM data operations and their row/object outcomes.
- **Segment and Segment Membership**: Structured criteria, exclusions, computed eligibility, preview, and refresh state.
- **Campaign, Recipient, Dispatch Attempt, Campaign Event**: Scheduled governed outreach and attributable outcomes.
- **Automation Rule, Version, Execution, Action Result**: Deterministic trigger-condition-action behavior and audit history.
- **Integration, Sync Record, API Credential, External Webhook**: Scoped external-system contracts and reconciliation state.
- **Knowledge Article, Version, Chunk, Access Policy**: Governed source material and retrieval provenance.
- **AI Policy, Evaluation, Invocation, Suggestion, Feedback, Tool Action, Handoff**: Optional assisted behavior, evidence, cost, and human control.
- **Privacy Request, Retention Policy, Legal Hold, Supplier, Incident**: LGPD and governance workflows.
- **Audit Event, Metric Definition, Metric Event, Report, Alert**: Integrity evidence and operational measurement.
- **Job, Lease, Retry, Dead Letter, Recovery Action**: Durable background execution and operator recovery.
- **Migration, Release, Backup, Restore Drill**: Reproducibility, deployment identity, rollback, and continuity evidence.

## Assumptions

- `CRMTSiAPP_Self-Hosted.md` and its fail-closed parity matrix define the complete scope; this feature does not narrow them to navigation repair.
- PostgreSQL remains the canonical store, and the deployed application remains self-hosted with no Supabase dependency.
- Core business workflows must work without an AI provider. AI and optional providers degrade to explicit disabled states.
- External credentials are supplied only through the established secret-management path and are never embedded in code, tests, logs, command lines, or evidence.
- Portuguese (Brazil) is the default operating language; timezone-aware behavior is mandatory.
- All remote execution and validation follow named idempotent tmux sessions with restricted logs, separate exit-code files, and independent final validation.

## Dependencies

- Access to a supported provider sandbox or approved fake contract for messaging status, retries, media, and policy behavior.
- A configured identity provider is needed for a live external-login canary; local standards-compliant contract testing remains mandatory without it.
- A configured model provider is needed only for the final live AI canary; all safety, tenant isolation, redaction, evaluation, and disabled-mode gates remain mandatory without it.
- Off-host backup storage and a disposable restore target are required for the final recovery drill.
- Product owners must supply legally approved retention, consent, incident, and supplier-policy values before production activation; the workflows and safe defaults are still in scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of visible navigation entries open an authorized functional workspace, and 100% of those workspaces complete their primary persisted workflow in the authenticated acceptance sweep with zero unexpected 4xx/5xx responses or placeholders.
- **SC-002**: Every row in the normative parity matrix is marked `Completo` or `Bloqueado externo`; any `Bloqueado externo` row includes passing local contract, negative, disabled-mode, and simulation evidence plus the exact missing external prerequisite.
- **SC-003**: Cross-tenant and object-scope tests cover 100% of identifiers, searches, exports, attachments, jobs, campaigns, knowledge retrieval, AI context, and recovery actions with zero unauthorized disclosure or mutation.
- **SC-004**: Duplicate and concurrent delivery tests for inbound events, outbound attempts, campaigns, automations, imports, privacy jobs, and recovery actions create zero duplicate business effects across at least 100 repeated/concurrent attempts per workflow.
- **SC-005**: Under the documented representative load, 95% of webhook acknowledgements and Inbox interactions complete in under 500 ms and 95% of searches complete in under 1 second, with no silent loss.
- **SC-006**: 100% of campaign recipients satisfy consent, suppression, template, service-window, tenant, and quota eligibility at send time; no ineligible fixture recipient is dispatched.
- **SC-007**: Published report fixtures reproduce every displayed count and percentile exactly, and every export matches the selected filters and definitions.
- **SC-008**: Administrator MFA, role/object authorization, secret-transport, privacy, retention, incident, and audit-integrity acceptance suites complete with zero critical or high-severity unresolved findings.
- **SC-009**: AI evaluation demonstrates zero cross-tenant retrieval, zero unconfirmed irreversible action, and zero prohibited PII transmission across the adversarial acceptance corpus; every suggestion exposes evidence and human disposition.
- **SC-010**: A clean installation, in-place upgrade, deployment, rollback, and isolated restore all pass; the restore meets an RPO of 15 minutes or better and an RTO of 60 minutes or better.
- **SC-011**: All mandatory test classes run without skips and pass before release; dependency, secret, static, dynamic, accessibility, and browser scans report no unresolved critical or high-severity defects.
- **SC-012**: Independent live validation confirms the deployed release identity, health, core data-plane workflow, worker processing, tenant isolation, and rollback evidence, and all product and infrastructure documentation matches the observed runtime.
