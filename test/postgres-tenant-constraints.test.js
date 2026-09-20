const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tenantMigration, DEFAULT_TENANT_ID } = require('../domain-schema');

const schema = fs.readFileSync(path.join(__dirname, '..', 'domain-schema.js'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', 'migrate.js'), 'utf8');

const TABLES = ['contacts', 'leads', 'companies', 'teams', 'queues', 'templates', 'channels', 'tags', 'conversations', 'conversation_messages', 'audit_events', 'outbox_jobs', 'delivery_events', 'failed_jobs', 'conversation_assignments', 'internal_notes', 'canned_responses', 'automation_rules', 'automation_runs', 'privacy_requests', 'retention_runs', 'metrics_rollups'];

test('tenant migration defines tenant_id for all domain tables', () => {
  const sql = tenantMigration();
  for (const table of TABLES) {
    assert.match(sql, new RegExp(`alter table ${table} add column if not exists tenant_id uuid`));
    assert.match(sql, new RegExp(`create index if not exists ${table}_tenant_idx on ${table}\\(tenant_id\\)`));
  }
});

test('tenant migration drops global uniqueness and introduces tenant-scoped unique constraints', () => {
  const sql = tenantMigration();
  assert.match(sql, /teams_tenant_name_key/);
  assert.match(sql, /queues_tenant_name_key/);
  assert.match(sql, /tags_tenant_name_key/);
  assert.match(sql, /settings_tenant_key/);
});
