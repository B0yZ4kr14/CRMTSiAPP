const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', 'migrate.js'), 'utf8');
const domainSchema = fs.readFileSync(path.join(__dirname, '..', 'domain-schema.js'), 'utf8');

test('session TTL is configurable and persisted with a bounded server-side expiration', () => {
  assert.match(source, /SESSION_TTL_SECONDS/);
  assert.match(source, /sessionTtlSeconds = clampNumber/);
  assert.match(source, /now\(\)\+\(\$6 \* interval '1 second'\)/);
  assert.match(source, /Max-Age=\$\{sessionTtlSeconds\}/);
});

test('session revocation is durable and auditable instead of deleting evidence', () => {
  assert.match(migration, /revoked_at timestamptz/);
  assert.match(migration, /revoked_by text/);
  assert.match(migration, /revoked_reason text/);
  assert.match(domainSchema, /alter table sessions add column if not exists revoked_at timestamptz/);
  assert.match(source, /s\.revoked_at is null/);
  assert.doesNotMatch(source, /delete from sessions where token_hash/);
  assert.match(source, /update sessions set revoked_at=now\(\),revoked_by=\$2,revoked_reason='logout'/);
  assert.match(source, /action:'auth\.logout'/);
});

test('session rotation revokes the prior credential on login and exposes admin revocation route', () => {
  assert.match(source, /rotateSession\(/);
  assert.match(source, /revoked_reason='rotated'/);
  assert.ok(source.includes("validSections = ['start"));
  assert.ok(source.includes("url.pathname==='/settings/security/sessions'"));
  assert.match(source, /action:'auth\.session_revoked'/);
});
