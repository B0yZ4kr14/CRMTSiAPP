#!/usr/bin/env bash
set -euo pipefail

log=/root/.cache/tsi-crm-postgres-isolation-gate.log
exit_file=/root/.cache/tsi-crm-postgres-isolation-gate.exit
role=crmtsiapp_test_runner
secret=$(openssl rand -hex 32)

: >"$log"
printf '1' >"$exit_file"
exec >>"$log" 2>&1

cleanup() {
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "drop role if exists ${role}" postgres >/dev/null 2>&1 || true
}
trap cleanup EXIT

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "create role ${role} login createdb password '${secret}'" postgres
export TEST_DATABASE_ADMIN_URL="postgresql://${role}:${secret}@127.0.0.1:5432/postgres"
cd /opt/tsi-stack/apps/crm/crmtsiapp
# Execute isolated-database suites serially. Node's test runner schedules files
# concurrently; each suite creates and force-drops an ephemeral database, so
# parallel files can terminate a still-closing connection on PostgreSQL.
node --test test/postgres-inbound-concurrency.test.js
node --test test/postgres-tenant-inbox.test.js
printf '0' >"$exit_file"
