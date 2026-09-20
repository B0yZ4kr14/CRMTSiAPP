#!/usr/bin/env bash
set -euo pipefail

app=/opt/tsi-stack/apps/crm/crmtsiapp
log=/root/.cache/tsi-crm-settings-diagnosis.log
exit_file=/root/.cache/tsi-crm-settings-diagnosis.exit

: >"$log"
printf '1' >"$exit_file"

{
  date -Is
  systemctl is-active crmtsiapp
  set -a
  . /etc/crmtsiapp/crmtsiapp.env
  set +a
  cd "$app"
  node <<'NODE'
const { Pool } = require('pg');
const tenantId = '00000000-0000-4000-8000-000000000001';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const checks = [
  ['teams', 'select id,name,active from teams where tenant_id=$1 order by name'],
  ['channels', 'select c.id,c.name,c.provider,cc.validation_state from channels c left join channel_credentials cc on cc.channel_id=c.id where c.tenant_id=$1 order by c.name'],
  ['queues', 'select id,name,strategy,active from queues where tenant_id=$1 order by name'],
  ['templates', 'select id,name,language,status from templates where tenant_id=$1 order by created_at desc limit 100'],
  ['automation_rules', 'select id,name,trigger_type,conditions,actions,active,version from automation_rules where tenant_id=$1 order by name'],
  ['privacy_requests', 'select id,contact_phone,kind,status,requested_by,created_at from privacy_requests where tenant_id=$1 order by created_at desc limit 20'],
  ['audit_events', 'select id,action,resource_type,resource_id,metadata,created_at from audit_events where tenant_id=$1 order by created_at desc limit 20'],
];
(async () => {
  for (const [name, sql] of checks) {
    try {
      const result = await pool.query(sql, [tenantId]);
      console.log(`${name}: OK rows=${result.rowCount}`);
    } catch (error) {
      console.log(`${name}: ERROR ${error.code || 'unknown'} ${error.message}`);
    }
  }
  await pool.end();
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
NODE
} >>"$log" 2>&1

rc=$?
printf '%s' "$rc" >"$exit_file"
exit "$rc"
