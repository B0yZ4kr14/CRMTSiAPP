# Quickstart: Validate Complete UI Modules

This is the deterministic validation order for feature `002-complete-ui-modules`. Commands describe the target workflow; scripts and package entries that do not yet exist are implementation tasks, not current evidence.

## 1. Local Prerequisites

- Node.js 22 or newer.
- Exact dependencies installed from `package-lock.json`.
- A disposable PostgreSQL 17 database or admin connection able to create one.
- Chromium for authenticated browser acceptance.
- No production credentials in the shell history, command line, fixtures, or repository.

Use environment variables or the approved vault/secret service. Never print their values.

Expected non-secret variables include:

```text
TEST_DATABASE_URL
# or TEST_DATABASE_ADMIN_URL for isolated database provisioning

APP_BASE_URL
BROWSER_EXECUTABLE_PATH
```

Optional live provider variables are not prerequisites for provider-independent gates. Their absence must be reported under the bounded external-blocking rule.

## 2. Confirm Feature and Working Tree

```sh
git branch --show-current
git status --short
python3 .specify/scripts/python/check_prerequisites.py --json --require-tasks --include-tasks
```

Confirm the selected feature directory is:

```text
specs/002-complete-ui-modules
```

Do not discard unrelated working-tree changes.

## 3. Install Reproducibly

```sh
npm ci
npm audit --audit-level=high
```

The final acceptance runner also performs lock integrity, secret scanning, source checks, and SBOM generation. A critical/high unresolved finding fails release.

## 4. Provision and Migrate an Isolated Database

Set one supported test database variable without displaying it, then run:

```sh
npm run migrate
npm run test:postgres
```

The completed feature must replace the current narrow PostgreSQL command with a manifest-backed suite covering clean install, representative upgrade, migration rerun/interruption, tenancy, transactions, concurrency, search, jobs, and query plans.

Missing PostgreSQL configuration is a failure, not a skip.

## 5. Run Fast Behavioral Tests

Current baseline command:

```sh
npm test
```

Target commands generated during implementation:

```sh
npm run test:unit
npm run test:contracts
npm run test:security
npm run test:privacy
npm run test:ai-evaluation
```

A green process with skipped mandatory tests is not accepted.

## 6. Run the Application and Workers Locally

After migration, launch the web process and each enabled worker using the project service commands. The final implementation must expose bounded development commands for:

```text
web
outbox worker
webhook worker
campaign worker
automation worker
integration worker
privacy/export worker
knowledge indexing worker
```

Verify liveness separately from readiness and confirm each worker heartbeat is associated with the candidate release.

## 7. Authenticated Browser Acceptance

Target command:

```sh
npm run test:browser
```

The sweep must:

- Authenticate fixtures for every operational role.
- Visit every capability-visible route.
- Execute each primary persisted workflow and reload it.
- Verify direct unauthorized route and mutation denial.
- Cover empty, queued, success, validation, failure, disabled-provider, and recovery states.
- Report accessibility and console/network errors.
- Reject placeholders, dead controls, hardcoded metrics, and unexpected 4xx/5xx responses.

Use Chromium, not Brave.

## 8. Security, Resilience, and Performance

Target commands:

```sh
npm run test:security
npm run test:resilience
npm run test:performance
```

Required results include:

- Cross-tenant/BOLA isolation for all IDs and asynchronous artifacts.
- SSRF/DNS-rebinding/redirect and secret-leak rejection.
- Replay and 100-way concurrency without duplicate critical effects.
- Failure injection for database, provider, worker death, lease expiry, and retry storm.
- Webhook and Inbox p95 below 500 ms and search p95 below 1 second under the published workload.
- No silent data loss.

## 9. Full Fail-Closed Gate

Target command:

```sh
node scripts/acceptance-gate.mjs
```

The runner must consume the versioned mandatory manifest defined in `contracts/acceptance-gates.md`, write bounded JSON and human reports, and exit nonzero for any missing, skipped, stale, empty, or failing suite.

Review reports without copying secrets or personal fixture data into documentation.

## 10. Release Artifact

Create a reproducible artifact containing only tracked runtime files plus a manifest with:

- Source/release hash.
- Dependency lock hash.
- Migration checksums.
- Service definitions.
- Required Node/PostgreSQL versions.
- Acceptance report identity.
- Rollback compatibility.

Verify extraction and startup in an isolated local directory before remote deployment.

## 11. Remote Deployment Policy

Remote target: `vpstsiapp:/opt/tsi-stack/apps/crm/crmtsiapp/`.

Every remote payload—including read-only probes and final validation—runs inside a named idempotent tmux session on the remote host. Direct SSH is restricted to connectivity/bootstrap, tmux control, and sanitized evidence retrieval.

Use deterministic session names, private logs, and separate exit files. Example names:

```text
tsi-crm-release-002
tsi-crm-validate-002
tsi-crm-rollback-002
tsi-crm-restore-002
```

Remote artifacts should follow this pattern:

```text
/root/.cache/tsi-crm/<action>.log   mode 0600
/root/.cache/tsi-crm/<action>.exit  mode 0600
```

No credential, token, password, customer identifier, or secret-bearing URL may appear in the session name, argv, log, or exit file.

### Deployment Session

The deployment payload must be idempotent and perform, in order:

1. Verify candidate artifact and manifest hashes.
2. Capture timestamped application/database backup metadata.
3. Verify the backup is readable and copy it to the approved encrypted off-host destination.
4. Stop or drain affected workers safely.
5. Apply governed migrations with lock/checksum validation.
6. Install the versioned artifact into a release directory.
7. Activate atomically.
8. Restart required services.
9. Record sanitized status, release identity, log path, and final exit code.

Do not declare success from this session alone.

### Independent Validation Session

Run a distinct tmux session after deployment. It must verify:

- Active release/source identity.
- Separate liveness and readiness.
- Web and every required worker active with current heartbeat.
- Schema migration/checksum state.
- Authenticated critical UI journey.
- A real tenant-scoped write/read/reload workflow.
- Job/outbox processing and correlation.
- Cross-tenant denial canary.
- Provider-disabled or sandbox behavior as configured.
- No new critical/high security or runtime error.

Retrieve only bounded sanitized evidence and the exit file through SSH control operations.

## 12. Restore and Rollback Drills

Before final completion:

- Restore the encrypted backup to an isolated target and measure RPO/RTO.
- Run integrity and tenant-isolation checks on the restored data.
- Rehearse rollback to the prior release and compatible schema state.
- Re-run independent validation against the rolled-back release.
- Restore the candidate only through the same governed deployment path.

Target objectives:

```text
RPO <= 15 minutes
RTO <= 60 minutes
```

## 13. Documentation Closure

After all evidence passes for one release:

1. Update `docs/CRMTSIAPP-SELF-HOSTED-PARITY-MATRIX.md` row by row.
2. Attach sanitized test/runtime evidence references.
3. Update product, API, architecture, recovery, and operator documentation.
4. Update the corresponding `~/Projects/TSiHomeLab/VMs/VPSTSIAPP/` documentation and consolidated inventory.
5. Leave any live third-party canary without credentials as `Bloqueado externo`, with the exact prerequisite and passing local evidence.

No row becomes `Completo` from schema, menu, static HTML, hardcoded metric, documentation, service-manager status, or a skipped conditional test alone.
