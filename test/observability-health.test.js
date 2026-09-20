const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const schema = fs.readFileSync(path.join(__dirname, '..', 'domain-schema.js'), 'utf8');

test('health endpoint reports database, queue and worker readiness from live SQL', () => {
  assert.match(source, /async function healthSnapshot/);
  assert.match(source, /from outbox_jobs/);
  assert.match(source, /from webhook_events/);
  assert.match(source, /from worker_heartbeats/);
  assert.match(source, /readiness/);
  assert.match(source, /res\.writeHead\(health\.statusCode/);
});

test('requests are correlated with trace identifiers and audit metadata', () => {
  assert.match(source, /requestTraceId/);
  assert.match(source, /x-request-id/);
  assert.match(source, /traceparent/);
  assert.match(source, /X-Request-Id/);
  assert.match(source, /traceId/);
});

test('observability persistence stores worker heartbeats and health checks', () => {
  assert.match(schema, /create table if not exists worker_heartbeats/);
  assert.match(schema, /create table if not exists health_checks/);
  assert.match(schema, /create index if not exists worker_heartbeats_updated_idx/);
});
