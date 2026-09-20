# Background Job Contracts

**Feature**: `002-complete-ui-modules`

## Shared Job Envelope

Every asynchronous operation is persisted before execution:

```text
id                  opaque UUID
schemaVersion       positive integer
kind                allowlisted job kind
tenantId             required tenant boundary
actor                user or service identity reference
capabilitySnapshot   bounded decision metadata; sensitive execution rechecks current policy
correlationId        end-to-end request/event correlation
idempotencyKey       stable domain key
payload              typed bounded JSON or opaque artifact reference; no credentials
priority             bounded integer class
state                queued/leased/running/succeeded/failed/dead_letter/cancelling/cancelled
availableAt          UTC claim time
attempts/maxAttempts bounded retry counters
leaseOwner/token/expiry fenced lease
parentJobId          optional orchestration parent
createdAt/updatedAt/completedAt
```

Unique `(tenant_id, kind, idempotency_key)` returns the original job/result on duplicate enqueue.

## Atomic Enqueue

The request or event transaction writes:

1. Domain state transition.
2. Append-only domain/audit event.
3. Job intent using a stable idempotency key.

If any write fails, none commit. Workers do not discover work by scanning mutable business state except explicit reconciliation jobs.

## Claim and Fenced Lease

Claim uses one transaction and `FOR UPDATE SKIP LOCKED` or equivalent:

- Select a claimable job by priority and availability.
- Transition `queued|failed -> leased`.
- Set worker, random lease token, and expiry.
- Append attempt start.

A worker must present the current lease token to transition state or record effects. Completion by an expired/stale token affects zero rows and triggers reconciliation rather than blind retry.

Workers heartbeat or extend leases only while actively processing. Lease duration exceeds one bounded step, not an entire unbounded provider workflow.

## States and Transitions

```text
queued -> leased -> running -> succeeded
  |         |          |
  |         |          +-> failed -> queued (retryable, attempts remain)
  |         |                     -> dead_letter (terminal/exhausted)
  |         +-> queued (lease expires before external effect)
  |         +-> reconciliation_required (effect may be ambiguous)
  +-> cancelling -> cancelled
leased|running -> cancelling -> cancelled (before next side effect)
```

An expired lease after a possibly accepted external call is not automatically redelivered. It enters reconciliation-required/unknown outcome until provider/domain evidence resolves it.

## Retry and Backoff

- Error classification: validation, authorization, policy, authentication, rate limit, timeout, dependency unavailable, conflict, unknown.
- Validation/authorization/policy and most authentication failures are terminal until an explicit corrected recovery action.
- Rate limit honors bounded provider retry time.
- Timeout/unavailable uses exponential backoff with jitter and a configured maximum.
- Retry count and next availability are persisted.
- Worker process loops do not hide retries in memory.

## Cancellation and Kill Switch

- Cancellation request is durable and idempotent.
- Workers check cancellation, tenant/module kill switch, and current eligibility immediately before every external effect and between batches.
- Cancellation cannot erase completed attempts.
- A root job propagates cancellation to unscheduled children transactionally or through idempotent cancellation jobs.
- Resumption creates an authorized state transition; it does not silently clear terminal errors.

## Dead Letter and Recovery

Dead-letter records preserve job ID, payload digest, terminal reason, attempts, last lease/release, correlation, and timestamp without secrets.

Recovery actions require `recovery:execute`, tenant/object scope, CSRF for HTML, actor reason, and action idempotency key:

- `retry`: only when effect is known absent or idempotent.
- `reconcile`: query provider/domain state and record resolution.
- `cancel`: terminate pending future effects.
- `discard`: exceptional terminal acknowledgement; never deletes evidence.

Recovery appends evidence and either requeues the same logical job safely or creates a linked replacement with a new explicit operation key.

## Batch and Fan-Out

Root jobs produce bounded child batches with deterministic keys. Progress is derived from child terminal states, not an in-memory counter. Fan-out stores a stable cursor/snapshot version so retries do not skip or duplicate members. Batch size and concurrency are configurable per tenant/provider.

## Campaign Jobs

### Kinds

- `campaign.prepare`
- `campaign.dispatch_batch`
- `campaign.dispatch_recipient`
- `campaign.reconcile`
- `campaign.cancel`

### Keys

- Prepare: `campaign:{campaignId}:version:{version}`.
- Recipient: `campaign:{campaignId}:recipient:{recipientId}:template:{templateVersion}`.
- Provider send uses recipient job ID/client message ID consistently.

### Contract

Prepare locks the approved/scheduled version, materializes or validates recipients, and creates bounded dispatch batches. Before each recipient effect, recheck campaign state, tenant quota, channel/template approval, consent, suppression, service-window policy, destination validity, and contact version relevant to eligibility.

Ineligible recipients become terminal `suppressed` with reason and are not provider attempts. Cancellation prevents creation/claim of new recipient effects. Delivery events update recipient metrics idempotently.

## Automation Jobs

### Kinds

- `automation.evaluate`
- `automation.execute_action`
- `automation.resume_timer`
- `automation.rollback_effect` only for explicitly compensatable actions

### Key

`ruleVersion:{id}:trigger:{eventType}:{eventId}:dryRun:{bool}`; action adds ordinal/action version.

### Contract

Evaluation loads immutable rule version and trigger event, records condition trace, and creates ordered action jobs. Dry-run records `proposed` actions and cannot enqueue side effects. Each action validates current rule kill switch, actor/service capability, tenant object scope, and action schema. Retried trigger/action cannot duplicate an effect.

Fallback/handoff paths are explicit typed transitions, not exception strings. Timers persist UTC time plus original timezone/policy version.

## Integration Jobs

### Kinds

- `integration.sync_page`
- `integration.sync_record`
- `integration.reconcile`
- `external_webhook.deliver`
- `integration.health_check`

### Contract

Payload names integration and opaque credential reference, never secret. Page cursors and external versions are persisted. Record sync uses `(integration, domain object, operation, external version)` keys. Conflict policy is explicit: provider-wins, CRM-wins, manual, or typed merge. Unknown outcomes reconcile before resend.

Circuit state is persisted or consistently derived from recent attempts. Opening a circuit delays new effects and surfaces degraded health; manual reset is authorized/audited.

Outgoing webhooks are signed at transport time and have independent delivery attempts/DLQ.

## Privacy and Retention Jobs

### Kinds

- `privacy.discover_subject`
- `privacy.export_system`
- `privacy.anonymize_system`
- `privacy.delete_system`
- `privacy.assemble_export`
- `retention.dry_run`
- `retention.execute_batch`
- `privacy.expire_artifact`

### Contract

Each system/resource step has its own idempotency key and outcome. Verification and policy authorization precede enqueue. Execution rechecks legal hold immediately before mutation. A held item records `blocked_by_hold`; it is not counted as deleted. Partial failure keeps the request in an explicit non-complete state.

Exports contain only authorized matched data, are encrypted/opaque, digest-verified, expiring, and access-audited. Expiry removes bytes while retaining required metadata/evidence.

Retention dry-run and execution use the same versioned selector. Execution stores per-item outcomes and can resume from a stable keyset cursor.

## Import, Export, and Bulk Jobs

- Import parses a bounded artifact in batches, neutralizes unsafe spreadsheet formulas for output, validates each row, and stores per-row outcome. Duplicate retry does not recreate a contact already linked to that row key.
- Export freezes normalized filters/definition versions and reads tenant-scoped keyset pages. Artifact publication is atomic after digest completion.
- Bulk jobs freeze a bounded selection/query definition and authorize each target at execution; revocation or scope loss produces denied outcomes rather than broad execution.

## Knowledge Indexing Jobs

### Kinds

- `knowledge.index_version`
- `knowledge.remove_version`
- `knowledge.rebuild_tenant`

Index key includes tenant, article version, and content checksum. Only published/current/authorized metadata is indexable. A superseded version is removed or made ineligible before new retrieval can select it. Rebuild uses a stable version cursor and cannot cross tenant indexes.

## AI Jobs

### Kinds

- `ai.classify`
- `ai.summarize`
- `ai.suggest_reply`
- `ai.evaluate_case`
- `ai.tool_action`
- `ai.handoff`

Before provider call: recheck feature flag, actor capability, tenant evidence scope, redaction policy, content bounds, and cancellation. Invocation key includes purpose, policy/model version, evidence digest, and requested object version.

Suggestion retries may reuse a known safe result. Tool action has a distinct idempotency key, current authorization check, and confirmation record. Unknown external tool outcome reconciles; it is never blindly repeated.

## Reporting and Metrics Jobs

- `metrics.rollup`
- `report.run`
- `report.export`
- `alert.evaluate`

Metric event source keys prevent double counting. Rollups identify definition version and bucket. Reports freeze definition versions, filters, dimensions, and timezone. Alert evaluations use stable windows and deduplicate one open incident/alert instance per rule/window unless policy says otherwise.

## Worker Identity and Health

Each worker instance registers type, instance ID, candidate release hash, start time, last heartbeat, active leases, last success/failure, and graceful-drain state.

Readiness for a required worker considers:

- Recent heartbeat from the active release.
- Backlog age and count by state/type.
- Oldest claimable and dead-letter job.
- Repeated error class/rate.
- Database connectivity.
- Required provider state only for enabled capabilities.

Liveness only proves the process loop can respond; it does not claim dependencies healthy.

## Metrics

Per tenant/type without high-cardinality sensitive labels:

- Enqueued, claimed, succeeded, failed, retried, cancelled, dead-lettered.
- Queue latency and execution duration percentiles.
- Claimable backlog and oldest age.
- Lease expiry and fenced-completion rejection.
- Reconciliation-required count and age.
- Provider outcomes/rate limits/circuit state.
- Recovery actions and outcomes.

Correlation IDs remain searchable in logs/audit but are not unbounded metric labels.

## Shutdown and Deployment

Workers support drain:

1. Stop claiming new jobs.
2. Complete or safely checkpoint bounded current step.
3. Release jobs only if no ambiguous external effect exists.
4. Persist heartbeat/drained state.
5. Exit before deployment timeout.

A new release claims only schema versions it understands. Migration/release manifest states minimum compatible worker and web versions. Rollback cannot activate a binary that cannot read already-enqueued job schema.

## Mandatory Tests

For every job kind:

- Duplicate enqueue returns one logical job.
- At least 100 concurrent claims produce one active lease/effect.
- Stale lease token cannot complete.
- Retry classification and backoff are persisted.
- Cancellation/kill switch prevents the next external effect.
- Exhaustion creates one dead letter.
- Recovery is authorized, audited, and idempotent.
- Cross-tenant ID/payload/reference is denied.
- Worker crash before effect, after effect, and before completion is reconciled without silent loss or duplicate effect.
- Metrics/health reflect the actual state.

Provider-backed jobs additionally pass timeout, rate-limit, malformed response, unsafe endpoint, credential-redaction, and unknown-outcome tests.
