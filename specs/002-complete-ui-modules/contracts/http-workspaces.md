# HTTP and Workspace Contracts

**Feature**: `002-complete-ui-modules`

## Shared Rules

- All authenticated requests resolve session, active tenant membership, effective capability/scope, CSRF state where applicable, and correlation ID before domain access.
- Reads predicate tenant before object ID. Unsafe denial is returned as not found or a generic forbidden response without disclosing another tenant's object.
- HTML mutations use CSRF tokens. JSON APIs use scoped credentials/signatures and request idempotency where defined.
- Every mutation validates bounded input, expected version for concurrency-sensitive objects, authorization, and state transition.
- Success persists domain state and audit evidence atomically; asynchronous intent is written in the same transaction.
- Validation errors preserve safe form values and identify fields. Conflict returns a stale-version/current-state hint. Provider unavailability never fabricates success.
- List routes use stable keyset cursors, allowlisted sorts/filters, and bounded page sizes. Cursor includes tenant-independent opaque ordering state but is valid only in its tenant/filter context.
- Sensitive exports are jobs. Retrieval rechecks capability and tenant and enforces expiry.

## Response and UI States

Every workspace supports the states that apply: `empty`, `ready`, `validation_error`, `conflict`, `queued`, `running`, `succeeded`, `failed`, `cancelled`, `disabled`, and `forbidden`. Navigation is capability-derived, but routes remain server-authorized.

## Route Families

### Dashboard and Reports

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/dashboard` | GET | `report:read` | Period/unit filters; real versioned KPIs and health summary |
| `/reports` | GET | `report:read` | Allowlisted dimensions/measures, keyset result or bounded report run |
| `/reports/:id` | GET | `report:read` | Report definition/run state and evidence of metric versions |
| `/reports/:id/exports` | POST | `report:export` | CSRF, expected definition version, filter schema; returns queued export job |
| `/exports/:id` | GET | owning read capability | Reauthorizes tenant/requester scope; redirects/streams expiring artifact only when complete |

Unknown dimensions, measures, sort keys, or timezone fail validation. UI and export reference identical metric-definition versions and normalized filters.

### Inbox and Conversations

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/inbox` | GET | `conversation:read` | Views `queue`, `unassigned`, `mine`, `all`, `closed`, `snoozed`, `follow-up`; shareable filters and cursor |
| `/inbox` | POST | `conversation:write` | Create permitted manual conversation using tenant-owned contact/channel |
| `/inbox/:id` | GET | `conversation:read` + object scope | Thread, timeline summary, assignment/SLA/presence, composer eligibility |
| `/inbox/:id/messages` | POST | `conversation:write` | Text/media reply; idempotency key; window/consent/template/media checks; enqueues outbox |
| `/inbox/:id/templates` | POST | `conversation:write` | Immutable approved template version and validated variables |
| `/inbox/:id/assignment` | POST | `conversation:assign` | Expected conversation version, target user/team/queue, reason; append assignment event |
| `/inbox/:id/transfer` | POST | `conversation:transfer` | Same as assignment plus prior owner and transfer reason |
| `/inbox/:id/status` | POST | `conversation:write` | Close/reopen with expected version and reason where configured |
| `/inbox/:id/snooze` | POST | `conversation:write` | IANA timezone-aware due time and optional follow-up owner |
| `/inbox/:id/notes` | POST | `conversation:note` | Bounded internal note and visibility scope |
| `/inbox/:id/macros/:macroId` | POST | `conversation:write` | Preview/execute typed macro; authorize each action |
| `/inbox/:id/presence` | POST | `conversation:read` | Bounded heartbeat; presence never grants access |
| `/attachments/:id` | GET | parent conversation read | Expiring/revalidated clean attachment access |

Conflict does not overwrite another agent's mutation. Duplicate message idempotency key returns the original accepted result. Unsafe or infected media is rejected before enqueue.

### Contacts and Customer 360

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/contacts` | GET | `contact:read` | Tenant-safe search, tags, owner/team/lifecycle filters, keyset cursor |
| `/contacts` | POST | `contact:write` | Normalize identity, detect possible duplicates, create contact and timeline event |
| `/contacts/:id` | GET | `contact:read` + object scope | 360 profile, consent/suppression, opportunities, external refs, paginated timeline |
| `/contacts/:id` | POST | `contact:write` | Expected version; validated profile/owner/team/lifecycle fields |
| `/contacts/:id/consents` | POST | `consent:manage` | Purpose/channel/action/source/policy/evidence; withdrawal creates suppression atomically |
| `/contacts/:id/tags` | POST | `contact:write` | Apply/remove tenant-owned tag idempotently |
| `/contacts/:id/custom-fields` | POST | `contact:write` | Typed value validated against active definition version |
| `/contacts/:id/opportunities` | POST | `opportunity:write` | Tenant pipeline/stage, minor-unit value/currency, owner/team |
| `/contacts/merge/preview` | POST | `contact:merge` | Source/target versions and proposed conflict resolution; expiring preview |
| `/contacts/merge/:previewId/commit` | POST | `contact:merge` | Revalidate and transactionally merge; idempotency key |
| `/contacts/imports` | POST | `contact:import` | Safe file reference/mapping/options; creates job |
| `/contacts/exports` | POST | `contact:export` | Authorized filters/columns; creates expiring export job |
| `/contacts/bulk` | POST | `contact:bulk` | Bounded selection/action; creates job with per-object outcome |

Opt-out and suppression are immediate. Merge preview does not mutate. Imports expose row-level outcomes without echoing unsafe spreadsheet content.

### CRM Configuration

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/settings/custom-fields` | GET/POST | `crm_schema:manage` | List/create/version typed definitions; key immutable after use |
| `/settings/tags` | GET/POST | `tag:manage` | Tenant-unique name/color/status |
| `/settings/pipelines` | GET/POST | `pipeline:manage` | Pipeline/stage lifecycle and ordering; used stages cannot be destructively removed |

### Segments

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/segments` | GET | `segment:read` | Real list/status/member count/refresh state |
| `/segments` | POST | `segment:write` | Create draft with bounded typed expression/exclusions |
| `/segments/:id` | GET | `segment:read` | Version, expression tree, preview/refresh history |
| `/segments/:id` | POST | `segment:write` | New immutable version with expected aggregate version |
| `/segments/:id/preview` | POST | `segment:read` | Same compiler as refresh/dispatch; bounded sample/count; no mutation |
| `/segments/:id/refresh` | POST | `segment:write` | Enqueue idempotent refresh for specified version |
| `/segments/:id/archive` | POST | `segment:write` | Blocks new campaign selection; preserves history |

The server accepts structured fields/operators only, never SQL fragments.

### Campaigns

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/campaigns` | GET | `campaign:read` | Lifecycle, segment/template/channel, recipient outcome totals |
| `/campaigns` | POST | `campaign:write` | Create draft referencing tenant-owned immutable versions |
| `/campaigns/:id` | GET | `campaign:read` | Configuration, eligibility, jobs, recipient/attempt metrics |
| `/campaigns/:id` | POST | `campaign:write` | Draft-only versioned edits |
| `/campaigns/:id/submit` | POST | `campaign:approve` | Validate completeness and request approval |
| `/campaigns/:id/approve` | POST | `campaign:approve` | Separate authorized approval and reason |
| `/campaigns/:id/schedule` | POST | `campaign:schedule` | Timezone-aware schedule; enqueue root job idempotently |
| `/campaigns/:id/pause` | POST | `campaign:control` | Kill-switch checked before new effects |
| `/campaigns/:id/resume` | POST | `campaign:control` | Revalidates campaign and quotas |
| `/campaigns/:id/cancel` | POST | `campaign:control` | Stops new scheduling; preserves attempted outcomes |
| `/campaigns/:id/recipients` | GET | `campaign:read` | Keyset outcomes with eligibility/failure reason |

All recipient sends recheck consent/suppression/template/window/quota at dispatch time.

### Automation

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/automation` | GET | `automation:read` | Real rule/version/status/execution summary |
| `/automation` | POST | `automation:manage` | Draft typed trigger/condition/action rule |
| `/automation/:id` | GET | `automation:read` | Versions, active state, execution history |
| `/automation/:id` | POST | `automation:manage` | Create immutable validated version |
| `/automation/:id/dry-run` | POST | `automation:manage` | Evaluates fixture/event; records proposals; no side effects |
| `/automation/:id/activate` | POST | `automation:manage` | Activates exact version after validation |
| `/automation/:id/rollback` | POST | `automation:manage` | Activates prior version with reason |
| `/automation/:id/pause` | POST | `automation:manage` | Immediate kill switch |
| `/automation/:id/runs` | GET | `automation:read` | Keyset executions/action outcomes/correlation |

Generic SQL, shell, URL, or untyped script actions are rejected.

### Integrations and API

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/integrations` | GET | `integration:read` | Provider/type/status/health/sync summary |
| `/integrations` | POST | `integration:manage` | Typed config plus secret reference; never redisplay secret |
| `/integrations/:id/test` | POST | `integration:manage` | Safe bounded health/contract test |
| `/integrations/:id/sync` | POST | `integration:manage` | Enqueue scoped reconciliation/sync |
| `/integrations/:id/disable` | POST | `integration:manage` | Blocks new effects, preserves history |
| `/settings/api-credentials` | GET/POST | `api_credentials:manage` | Metadata list/create; secret shown once only |
| `/settings/api-credentials/:id/revoke` | POST | `api_credentials:manage` | Immediate revocation, audited |
| `/settings/webhooks` | GET/POST | `webhook:manage` | Allowlisted event registration and signing secret reference |

External JSON APIs use `/api/v1/...`, scoped credentials, request IDs, idempotency keys for mutations, and the same domain services as HTML routes.

### Knowledge and AI

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/knowledge` | GET | `knowledge:read` | Authorized published/draft list and tenant-safe search |
| `/knowledge` | POST | `knowledge:write` | Create draft article/version |
| `/knowledge/:id` | GET | `knowledge:read` + ACL | Article versions, validity, owner, ACL, indexing state |
| `/knowledge/:id/versions` | POST | `knowledge:write` | Immutable new version |
| `/knowledge/:id/publish` | POST | `knowledge:publish` | Validate owner/validity/ACL, activate version, enqueue indexing |
| `/ai` | GET | `ai:use` | Accurate enabled/disabled provider/policy/evaluation state |
| `/ai/conversations/:id/summary` | POST | `ai:use` + conversation scope | Enqueue redacted evidence-bound summary |
| `/ai/conversations/:id/suggestions` | POST | `ai:use` + conversation scope | Enqueue suggestion; never auto-send |
| `/ai/suggestions/:id/feedback` | POST | `ai:use` | Accept/edit/reject with reason; sending remains separate authorized action |
| `/ai/tools/:tool/preview` | POST | tool-specific capability | Validate typed action and show effects/confirmation requirement |
| `/ai/tools/:tool/execute` | POST | tool-specific capability | Explicit confirmation and idempotency for irreversible actions |
| `/ai/evaluations` | GET/POST | `ai:manage` | View/enqueue versioned corpus run |

AI-disabled mode returns an actionable disabled workspace, not generic failure. Retrieval must filter tenant/ACL before ranking.

### Privacy and Governance

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/settings/privacy` | GET | `privacy:read` | Requests, due state, retention/legal hold summary |
| `/settings/privacy` | POST | `privacy:manage` | Create request with subject identity and type |
| `/privacy/:id` | GET | `privacy:read` | Verification, system matches, steps, holds, artifacts, audit |
| `/privacy/:id/verify` | POST | `privacy:manage` | Record controlled verification outcome |
| `/privacy/:id/execute` | POST | `privacy:manage` | Enqueue selected legal workflow after policy checks |
| `/privacy/:id/artifacts/:artifactId` | GET | `privacy:export` | Reauthorize and enforce expiry/access limit |
| `/settings/retention` | GET/POST | `retention:manage` | Versioned policies and legal holds |
| `/settings/retention/:id/dry-run` | POST | `retention:manage` | Enqueue non-mutating candidate run |
| `/settings/retention/:id/run` | POST | `retention:execute` | Enqueue execution; recheck holds per item |
| `/governance/suppliers` | GET/POST | `governance:manage` | Suppliers, transfers, categories, countries, evidence |
| `/governance/incidents` | GET/POST | `incident:manage` | Incident lifecycle, owner, deadline, escalation |
| `/governance/incidents/:id/events` | POST | `incident:manage` | Append triage/containment/notification/resolution event |
| `/settings/audit` | GET | `audit:read` | Tenant-scoped keyset audit with integrity state and safe filters |

Privacy completion cannot conceal partial/blocked systems. Legal hold conflicts yield explicit `partially_blocked` with evidence.

### Identity and Organization Settings

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/settings/team` | GET/POST | `team:manage` | User/team status, capacity, availability, membership lifecycle |
| `/settings/roles` | GET/POST | `role:manage` | Built-in/custom role capability/scope definitions |
| `/settings/users/:id/roles` | POST | `role:manage` | Assign/revoke bounded role with expected membership version |
| `/settings/mfa` | GET | authenticated | Factor/recovery status without secrets |
| `/settings/mfa/enroll` | POST | authenticated | Begin enrollment; raw secret only in controlled one-time response |
| `/settings/mfa/verify` | POST | authenticated | Verify challenge and activate factor |
| `/settings/mfa/recovery` | POST | authenticated recovery policy | Consume one recovery code and rotate/re-enroll safely |
| `/settings/identity` | GET/POST | `identity:manage` | OIDC metadata/mapping; secret references only |
| `/settings/sessions` | GET | authenticated | Own sessions; admins with capability can inspect bounded tenant metadata |
| `/settings/sessions/:id/revoke` | POST | owner or `session:manage` | Immediate revocation and audit |

Admin protected actions require configured assurance level. Privilege elevation cannot be self-approved unless explicitly allowed by policy and recovery controls.

### Operations and Recovery

| Route | Method | Capability | Contract |
|---|---|---|---|
| `/operations/jobs` | GET | `operations:read` | Keyset jobs by type/state/age without secret payloads |
| `/operations/dead-letters` | GET | `recovery:read` | Terminal failures and reconciliation status |
| `/operations/jobs/:id/retry` | POST | `recovery:execute` | Reason + idempotency; rejects nonrecoverable/unsafe state |
| `/operations/jobs/:id/cancel` | POST | `recovery:execute` | Cooperative cancellation/kill switch |
| `/operations/jobs/:id/reconcile` | POST | `recovery:execute` | Provider/domain-specific safe reconciliation |
| `/system/status` | GET | `operations:read` | Readiness components, workers, backlog age, release identity, alerts |
| `/live` | GET | public bounded | Process liveness only; no dependency or sensitive data |
| `/ready` | GET | protected/internal or bounded public | Required dependency state and release correlation |

## Error Contract

HTML and JSON map stable error classes:

- `validation_error` — 422, field/path details.
- `authentication_required` — 401.
- `forbidden` — 403 or disclosure-safe 404.
- `not_found` — 404.
- `conflict` — 409, expected/current version or duplicate idempotency result.
- `rate_limited` — 429 with bounded retry hint.
- `provider_disabled` — 409/503 according to attempted action, with setup status but no secret detail.
- `dependency_unavailable` — 503 for required readiness-dependent operation.
- `internal_error` — 500 with correlation ID only.

All responses include correlation/request ID and uniform security headers. Errors never include SQL, stack traces, credentials, secret-bearing URLs, or another tenant's identifiers.

## Contract Completion

A route family is complete only when route registry, capability/object-scope tests, CSRF/idempotency tests, PostgreSQL-real persistence/isolation, browser states, audit evidence, and live acceptance pass for the same release.
