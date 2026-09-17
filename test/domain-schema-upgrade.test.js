const test = require('node:test');
const assert = require('node:assert/strict');
const { foundationMigration } = require('../domain-schema');

test('foundation migration upgrades pre-existing webhook and outbox status constraints idempotently', () => {
  const sql = foundationMigration();
  assert.match(sql, /alter table webhook_events add column if not exists status text not null default 'pending'/i);
  assert.match(sql, /alter table webhook_events add column if not exists lease_token uuid/i);
  assert.match(sql, /alter table outbox_jobs add column if not exists lease_token uuid/i);
  assert.match(sql, /alter table webhook_events drop constraint if exists webhook_events_status_check/i);
  assert.match(sql, /alter table outbox_jobs drop constraint if exists outbox_jobs_status_check/i);
  assert.match(sql, /add constraint webhook_events_status_check.*dead_letter/i);
  assert.match(sql, /add constraint outbox_jobs_status_check.*delivery_unknown/i);
});
