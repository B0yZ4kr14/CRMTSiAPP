# Contract: Setup Wizard and Provider Management

**Feature**: `005-operational-experience`

All mutating browser requests require authenticated/bootstrapping context as appropriate, same-origin validation and CSRF protection. After activation, setup endpoints are closed permanently except read-only status.

## Setup bootstrap trust contract

While no administrator exists, every mutating setup request MUST authenticate with an installation-generated, high-entropy, single-use bootstrap credential delivered out-of-band to the local operator. The database stores only its password-grade hash, expiry, failed-attempt counter, lock state and immutable initial tenant binding.

- The credential is accepted only over the protected origin and only for setup mutations.
- It cannot read or mutate regular tenant resources and grants no provider-management capability after activation.
- Failed verification is rate-limited and audited without storing the presented value.
- CSRF and same-origin checks remain mandatory; bootstrap authentication does not replace them.
- Rotation invalidates the previous hash. Activation consumes the credential atomically with first-admin creation and setup state `active`.
- An expired, locked, consumed, wrong-tenant or absent credential fails closed.

## Setup

### `GET /setup/status`

Returns only:

```json
{"state":"pending","version":3,"completedSteps":["organization"],"requirements":[]}
```

No secret or password value is returned.

### `PUT /setup/draft`

Headers: `If-Match`, `X-Setup-Bootstrap` while no administrator exists, and CSRF token. The bootstrap header value is verified against the stored hash and is never logged. Body contains one or more non-secret normalized steps. Secret fields are rejected at this endpoint.

Responses:

- `200`: updated draft and next version
- `409`: stale version with safe conflict metadata
- `422`: field validation errors keyed by step/field
- `423`: setup already active or currently activating

### `POST /setup/validate`

Validates the current version and returns requirement statuses. External checks have bounded timeouts and sanitized errors. Validation does not activate the installation.

### `POST /setup/activate`

Headers: `If-Match`, idempotency key, `X-Setup-Bootstrap` while no administrator exists, and CSRF token. Password/initial secrets are accepted only in the request body over the protected connection and never echoed. Successful activation consumes the bootstrap credential in the same transaction.

Atomic outcomes:

- `201`: installation active, first admin/session transition complete
- `200`: identical idempotent activation already completed
- `409`: version/concurrency conflict
- `422`: unmet validation
- `423`: another activation owns the lock
- `500/503`: no partial activation is reported as success

## Provider and channel configuration

Base collection: `/settings/providers`

### Operations

- `GET /settings/providers`: list tenant-scoped masked configurations
- `POST /settings/providers`: create config and optional first secret
- `GET /settings/providers/:id`: read non-secret settings, masked hint and validation state
- `PUT /settings/providers/:id`: update non-secret settings with `If-Match`
- `POST /settings/providers/:id/secrets`: submit a new secret version; response never contains it
- `POST /settings/providers/:id/validate`: validate selected pending/active version
- `POST /settings/providers/:id/promote`: promote a validated version
- `POST /settings/providers/:id/disable`: disable future use

### Secret write body

Provider-specific fields are accepted only from an allowlisted schema. Unknown fields are rejected. Responses expose at most:

```json
{"secretVersionId":"uuid","maskedHint":"••••abcd","validationState":"untested"}
```

There is deliberately no `GET .../secrets/:id/value` contract.

### Authorization

- Setup bootstrap context exists only while installation is pending and is authenticated by the single-use bootstrap credential bound to the initial tenant.
- Provider list/read/write/test/promote require explicit capabilities; hide/show UI is not authorization.
- Every lookup predicates active `tenant_id` and resource ID.
- Validation destinations and methods are defined by server-side adapters; callers cannot provide arbitrary URLs.

### Audit/redaction

Audit records action, actor, tenant, provider config, version identifier and result code. Request bodies, ciphertext, authorization headers and provider response bodies are excluded from logs and audit metadata.
