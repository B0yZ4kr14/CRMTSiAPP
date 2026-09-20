const test = require('node:test');
const assert = require('node:assert/strict');
const { FOUNDATION_TABLES, foundationMigration, operationalExperienceMigration } = require('../domain-schema');

test('the foundation migration declares every security and operational domain table', () => {
  assert.deepEqual(FOUNDATION_TABLES, [
    'roles', 'user_roles', 'audit_events', 'secrets', 'secret_versions',
    'channels', 'channel_credentials', 'channel_sessions', 'webhook_events',
    'teams', 'team_members', 'queues', 'queue_members', 'tags', 'conversation_tags',
    'sla_policies', 'conversation_sla', 'routing_rules', 'templates', 'template_versions',
    'outbox_jobs', 'delivery_events', 'failed_jobs', 'conversation_assignments', 'internal_notes',
    'automation_rules', 'automation_runs', 'privacy_requests', 'retention_runs', 'metrics_rollups',
    'installation_setup', 'provider_configs', 'admin_operations', 'queue_controls',
  ]);
  const foundationSql = foundationMigration();
  const operationalSql = operationalExperienceMigration();
  for (const table of FOUNDATION_TABLES) {
    const sql = ['installation_setup', 'provider_configs', 'admin_operations', 'queue_controls'].includes(table) ? operationalSql : foundationSql;
    assert.match(sql, new RegExp(`create table if not exists ${table}`));
  }
});

test('the foundation migration protects outbox idempotency and webhook deduplication in PostgreSQL', () => {
  const sql = foundationMigration();
  assert.match(sql, /idempotency_key text not null unique/);
  assert.match(sql, /provider_event_id text not null/);
  assert.match(sql, /unique \(channel_id, provider_event_id\)/);
  assert.match(sql, /status text not null default 'pending'/);
});