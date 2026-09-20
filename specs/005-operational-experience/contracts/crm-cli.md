# Contract: `crm-cli`

**Feature**: `005-operational-experience`

## Invocation

```text
crm-cli [global-options] <resource> <action> [options]
```

Global options:

- `--tenant <id>` required for tenant-mutating commands
- `--format text|json` default `text`
- `--idempotency-key <value>` required for non-interactive destructive/mutable automation
- `--yes` confirms a destructive command only when all other guards pass
- `--timeout <seconds>` bounded by command policy
- `--help`, `--version`

Passwords/tokens MUST NOT be accepted as argv values. Commands use masked prompt, stdin or a caller-owned restricted file descriptor. Structured output never contains secrets.

## Commands

```text
crm-cli admin create --tenant T --email E --login L --name N
crm-cli admin reset-password --tenant T --user U
crm-cli health check [--deep]
crm-cli workers list [--tenant T]
crm-cli queues drain --tenant T [--queue Q] --timeout S
crm-cli privacy request --tenant T --kind export|anonymize|delete --subject ...
```

## Structured envelope

```json
{
  "ok": true,
  "code": "ADMIN_CREATED",
  "operationId": "uuid",
  "tenantId": "uuid",
  "data": {},
  "warnings": []
}
```

On error, `ok=false`; `error` contains stable code, safe message and optional actionable details. Stack traces require an explicit local debug mode and still undergo redaction.

## Exit codes

| Exit | Meaning |
|------|---------|
| 0 | Completed successfully or idempotent prior completion returned |
| 1 | Unexpected internal failure |
| 2 | Invalid invocation/input |
| 3 | Authentication/authorization/tenant refusal |
| 4 | Not found, state conflict or stale version |
| 5 | Required dependency unavailable/timeout |
| 6 | Operation stopped fail-closed; recovery/action required |
| 130 | Interrupted by operator; final state reported safely |

## Destructive operation rules

- Interactive: show tenant, resource count/scope and effect; require explicit confirmation.
- Non-interactive: require both `--yes` and `--idempotency-key`.
- Authorization and tenant checks occur after parsing and before mutation.
- An idempotency collision with different normalized input is a conflict, never reuse.

## Queue drain semantics

Drain disables new claims for the selected tenant/queue, waits up to the timeout for active leases, and reports queued/processing/expired counts. It does not delete jobs. Timeout exits `6` with the queue still in an explicit safe state and recovery instructions.

## Privacy semantics

A request is recorded and processed by policy. Output distinguishes deleted, anonymized, exported and legally retained data. The command never emits personal data to stdout unless the caller explicitly chooses a restricted output file for an authorized export.
