const test = require('node:test');
const assert = require('node:assert/strict');
const { foundationMigration } = require('../domain-schema');

test('operational migration gives conversations real ownership, priority and internal context', () => {
  const sql = foundationMigration();
  assert.match(sql, /conversation_assignments/);
  assert.match(sql, /internal_notes/);
  assert.match(sql, /assigned_user_id/);
  assert.match(sql, /queue_id uuid/);
  assert.match(sql, /priority text/);
});

test('operational schema has durable privacy, automation and metric work records', () => {
  const sql = foundationMigration();
  for (const table of ['automation_rules', 'automation_runs', 'privacy_requests', 'retention_runs', 'metrics_rollups']) {
    assert.match(sql, new RegExp(`create table if not exists ${table}`));
  }
  assert.match(sql, /create table if not exists automation_rules \(id uuid primary key, tenant_id uuid references tenants\(id\) on delete restrict, name text not null, trigger_type text not null, conditions jsonb/);
  assert.match(sql, /create table if not exists privacy_requests \(id uuid primary key, tenant_id uuid references tenants\(id\) on delete restrict, contact_phone text not null, kind text not null/);
});
