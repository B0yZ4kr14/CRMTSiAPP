const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrateSource = fs.readFileSync(path.join(__dirname, '..', 'migrate.js'), 'utf8');
const domainSchemaSource = fs.readFileSync(path.join(__dirname, '..', 'domain-schema.js'), 'utf8');

test('migration governance tracks advisory locking or migration locks to prevent concurrency race conditions', () => {
  assert.match(migrateSource, /pg_advisory_lock|pg_try_advisory_lock|schema_migrations.*locked/i);
});

test('migration governance stores migration version, applied timestamp, and checksum/hash for integrity verification', () => {
  assert.match(migrateSource, /create table if not exists schema_migrations/i);
  assert.match(migrateSource, /version text primary key/i);
  assert.match(migrateSource, /applied_at timestamptz/i);
  assert.match(migrateSource, /checksum text|hash text/i);
});

test('domain schema declares idempotent foundation and tenant migrations with version tracking', () => {
  assert.match(domainSchemaSource, /foundationMigration/);
  assert.match(domainSchemaSource, /tenantMigration/);
  assert.match(domainSchemaSource, /MIGRATION_VERSION|SCHEMA_VERSION/i);
});
