# Research — runtime evidence

## 2026-09-18

- Local authenticated route sweep added in `test/browser-route-sweep.test.js`; it exercises the implemented primary/settings GET routes through the real `server.js` route handler with a bounded authenticated HTTP fixture.
- Local PostgreSQL settings compatibility coverage added in `test/postgres-settings-compatibility.test.js` for fresh migration columns, tenant isolation, role restrictions, CSRF and persisted automation/privacy/audit workflows.
- Local targeted verification: `node --test test/browser-route-sweep.test.js test/server-route-capabilities-regression.test.js test/rbac.test.js test/operational-schema-regression.test.js test/domain-schema.test.js test/settings-schema-contract.test.js test/postgres-settings-compatibility.test.js` => 16 tests, 13 pass, 3 skipped (PostgreSQL env-gated), 0 fail.
- Local full verification: `npm test` => 176 tests, 169 pass, 7 skipped, 0 fail.
- Live `vpstsiapp` migration was executed through named tmux session `tsi-crm-deploy`; service status was active for `crmtsiapp`, `crmtsiapp-outbox-worker` and `crmtsiapp-webhook-worker`.
- Independent validation through named tmux session `tsi-crm-validate` observed `/health` HTTP 200, canonical automation/privacy/audit queries returning successfully, and diagnosis exit code `0`.
- Live diagnosis returned: teams OK, channels OK, queues OK, templates OK, automation_rules OK, privacy_requests OK, audit_events OK.
- Local full verification after review remediation: `npm test` => 183 tests, 176 pass, 7 environment-gated PostgreSQL skips, 0 fail.
- Targeted review-remediation verification: 34 tests, 31 pass, 3 PostgreSQL environment-gated skips, 0 fail; `git diff --check` clean and `npm audit --audit-level=high` reports 0 vulnerabilities.
- Independent tmux deploy `tsi-crm-review-remediation-deploy` exit `0`, backup `/opt/tsi-stack/backups/crmtsiapp-before-postgres-runtime-20260919T000850Z`; validation tmux `tsi-crm-review-remediation-validate` exit `0`: all services active, `/health` HTTP 200, tenant-scoped role/settings columns present, and delivery tenant backfill complete.
- PostgreSQL-real test execution remains environment-gated locally; remote production schema was queried successfully, but an isolated disposable-database integration run is still required before claiming this a fully closed PostgreSQL integration gate.
