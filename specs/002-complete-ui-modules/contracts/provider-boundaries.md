# Provider Boundary Contracts

**Feature**: `002-complete-ui-modules`

## General Contract

Every external provider is accessed through a typed adapter owned by one domain. Business services never construct provider URLs, headers, credentials, or provider-specific payloads directly.

Each call receives:

- `tenantId`, `actorId` or service identity, capability decision, and `correlationId`.
- A stable operation/idempotency key.
- A typed request validated before transport.
- A bounded timeout and explicit redirect policy.
- An encrypted credential reference, never a clear credential in the job payload, URL, argv, log, audit metadata, or user-visible error.

Each adapter returns a normalized result:

```text
status: succeeded | pending | retryable_failure | permanent_failure | disabled
providerReference: opaque optional identifier
attemptedAt: UTC timestamp
retryAfter: optional UTC timestamp or duration
errorCode: stable non-sensitive code
errorClass: authentication | validation | rate_limit | timeout | unavailable | policy | unknown
details: redacted bounded metadata
```

Provider-specific raw bodies are retained only when required, encrypted and retention-bound, and never used as the sole business state.

## Network and Secret Safety

Before any secret-bearing request:

1. Parse and normalize the destination.
2. Require an allowed scheme and approved port.
3. Reject embedded credentials, fragments, malformed hostnames, and disallowed address literals.
4. Resolve all host answers and reject loopback, link-local, multicast, unspecified, private, reserved, or mixed safe/unsafe answer sets unless the integration is an explicitly approved private provider.
5. Pin the validated resolution for the connection.
6. Disable redirects by default. If a provider contract requires redirects, validate every hop before forwarding a secret.
7. Apply request, connection, and total-operation deadlines.
8. Redact authorization headers, query secrets, cookies, tokens, phone numbers where not operationally required, and sensitive response bodies from logs and errors.

Negative contract tests must prove DNS rebinding/mixed-answer rejection, unsafe redirect rejection, timeout behavior, malformed response handling, and zero credential leakage.

## Messaging Providers

### Operations

- `health(channel)`
- `startSession(channel)` where supported
- `getQr(channel)` where supported
- `sendText(message)`
- `sendTemplate(message)`
- `sendMedia(message)`
- `verifyWebhook(rawRequest)`
- `parseWebhook(rawRequest)`
- `normalizeDelivery(providerEvent)`

### Required Behavior

- Inbound signatures are verified against the raw body before parsing.
- Provider event/message IDs become tenant-qualified idempotency keys.
- Webhook acknowledgement follows durable persistence and does not wait for downstream processing.
- Outbound operations require a stable client message ID. A retry returns or reconciles the same provider effect.
- Template approval, category, locale, variables, 24-hour policy, consent, suppression, and recipient eligibility are enforced before enqueue and rechecked before transport where mutable.
- Media transport uses controlled metadata and expiring access; adapters do not receive unrestricted filesystem paths.
- Provider delivery states normalize to `queued`, `sent`, `delivered`, `read`, `failed`, or `unknown` while preserving the opaque provider state for diagnostics.
- Rate-limit responses produce bounded `retryAfter`; authentication/policy failures do not retry indefinitely.

### Deterministic Fake

The fake adapter must script success, delay, timeout, rate limit, malformed output, authentication failure, duplicate webhook, reordered status, and recovery. It is mandatory in the acceptance gate and cannot be replaced by source-text assertions.

### Disabled Mode

Without credentials or channel setup, the UI reports `not_configured` or `disabled`, lists safe setup prerequisites, and blocks send/session actions. It must not report healthy, generate fake production identifiers, or drop queued business intent silently.

## External Identity

### OIDC Operations

- Discover issuer metadata from an administrator-approved issuer.
- Begin authorization with state, nonce, PKCE, tenant binding, and bounded return target.
- Exchange authorization code server-side.
- Validate issuer, audience, signature, nonce, timestamps, and authorized algorithms.
- Map external subject and verified claims to one tenant-local identity.
- Apply local role/team policy; provider claims never grant unconfigured local privilege.
- Revoke or terminate local sessions independently of provider availability.

Issuer discovery and key retrieval follow the network safety contract. Subject mappings are unique per tenant/issuer/subject. Account linking and role elevation require an authenticated, audited administrator workflow.

### SAML

SAML is an optional tier/provider contract. If no supported provider is configured, the product states this accurately. The local role, tenant mapping, session, logout, and disabled-mode contracts still apply; only a live provider canary may be externally blocked.

## Business Integration Providers

Adapters expose typed domain interfaces rather than generic HTTP:

- Customer: retrieve/upsert authorized identity and lifecycle references.
- Order: list/read order summaries and status.
- Ticket: create/read/update permitted ticket state.
- Payment: create or retrieve opaque payment links/status without storing financial credentials.
- Catalog: search/read approved product data.
- Calendar: check availability/create/cancel approved reservations.

Every synchronized record carries tenant, provider, external ID, external version, sync status, last attempt, last success, stable error code, and reconciliation state. Conflict rules are explicit per adapter. Retryable effects use idempotency keys; reads use bounded pagination and rate limits.

### External API and Webhooks

- API credentials are scoped, hashed or encrypted as appropriate, rotatable, and displayed only at creation.
- Incoming webhooks require signature, timestamp/replay window, event ID, tenant/provider binding, size/content-type limit, and durable acknowledgement.
- Outgoing webhooks are signed, retried through the shared job contract, and expose delivery history and dead-letter recovery.

## AI Provider Contract

AI is optional and disabled by default. Core CRM, knowledge, search, and rules function without it.

### Allowed Purposes

- Classification: intention, entities, language, priority, sentiment.
- Conversation summary.
- Reply suggestion.
- Tenant-scoped grounded retrieval synthesis.
- Handoff package generation.

### Pre-Provider Gate

1. Verify tenant/team feature flag and rollout assignment.
2. Verify actor capability and allowed purpose.
3. Select only tenant-authorized conversation and knowledge evidence.
4. Minimize and redact prohibited PII according to the active policy.
5. Record model/prompt/policy versions, evidence references, and correlation ID.
6. Apply token/content bounds and timeout.

### Result Contract

Results contain structured output, confidence where meaningful, evidence references, safety disposition, latency, usage/cost metadata, and human status `pending`, `accepted`, `edited`, or `rejected`. Chain-of-thought is never requested or stored.

Unsupported, ungrounded, malformed, or policy-violating output fails closed. Suggested replies are never sent automatically unless a separately authorized deterministic automation explicitly permits it under the same outbound eligibility gates.

### Tools

Tools are typed domain actions with JSON-schema-equivalent validation and local authorization. Generic SQL, shell, unrestricted HTTP, arbitrary URL fetch, and secret-reading tools are prohibited. Irreversible or externally visible actions require explicit user confirmation and an audited reason.

### Evaluation Fake and Live Canary

The deterministic fake emits grounded, ungrounded, PII-seeking, injection-bearing, delayed, malformed, and tool-request outputs. Acceptance requires a versioned pt-BR adversarial corpus. Absence of a live model credential can block only the live canary, not redaction, isolation, evaluation, disabled-mode, authorization, or audit evidence.

## Provider Health and Observability

Health is provider- and tenant-specific and distinguishes:

- `not_configured`
- `disabled`
- `healthy`
- `degraded`
- `unavailable`
- `authentication_error`
- `policy_error`

Health records never expose secrets. Metrics include bounded latency, normalized outcomes, rate-limit state, retry counts, circuit state, and last successful operation. Business readiness does not require optional providers; module readiness reports which capability is unavailable.

## Completion Gate

A provider boundary is complete only when typed adapter tests, deterministic fake tests, negative network/secret tests, disabled-mode UI, audit/correlation evidence, and retry/idempotency behavior pass. A live canary is additionally required when credentials and a safe sandbox are available; otherwise that canary alone is classified `Bloqueado externo` with the exact prerequisite recorded.
