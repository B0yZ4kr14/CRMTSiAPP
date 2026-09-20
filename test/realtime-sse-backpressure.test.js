const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createConnectionRegistry } = require('../modules/realtime/connection-registry');
const { heartbeatFrame } = require('../modules/realtime/sse-protocol');

function responseDouble(writeResults = []) {
  const response = new EventEmitter();
  response.frames = [];
  response.destroyed = false;
  response.write = frame => {
    response.frames.push(frame);
    return writeResults.length ? writeResults.shift() : true;
  };
  response.end = () => { response.ended = true; };
  response.destroy = () => { response.destroyed = true; };
  return response;
}

const SESSION_A = { tenantId: 'tenant-a', userId: 'user-a' };

test('connection registry enforces per-user and per-tenant quotas', () => {
  const registry = createConnectionRegistry({ maxPerUser: 1, maxPerTenant: 2 });
  const first = registry.register({ session: SESSION_A, response: responseDouble() });
  assert.equal(registry.connectionCount(SESSION_A), 1);
  assert.throws(
    () => registry.register({ session: SESSION_A, response: responseDouble() }),
    error => error.code === 'CONNECTION_QUOTA_EXCEEDED',
  );
  registry.register({ session: { tenantId: 'tenant-a', userId: 'user-b' }, response: responseDouble() });
  assert.throws(
    () => registry.register({ session: { tenantId: 'tenant-a', userId: 'user-c' }, response: responseDouble() }),
    error => error.code === 'CONNECTION_QUOTA_EXCEEDED',
  );
  first();
  assert.equal(registry.connectionCount(SESSION_A), 0);
});

test('bounded queues close a slow client rather than growing without limit', () => {
  const registry = createConnectionRegistry({ maxPerUser: 2, maxPerTenant: 4, maxQueueEvents: 2, maxQueueBytes: 128 });
  const response = responseDouble([false]);
  registry.register({ session: SESSION_A, response });
  assert.equal(registry.send(SESSION_A, 'frame-1'), true);
  assert.equal(registry.send(SESSION_A, 'frame-2'), true);
  assert.equal(registry.send(SESSION_A, 'frame-3'), true);
  assert.equal(registry.send(SESSION_A, 'frame-4'), false);
  assert.equal(response.ended || response.destroyed, true);
  assert.equal(registry.connectionCount(SESSION_A), 0);
});

test('drain flushes queued frames in order and heartbeats contain no data', () => {
  const registry = createConnectionRegistry({ maxPerUser: 2, maxPerTenant: 4, maxQueueEvents: 4, maxQueueBytes: 256 });
  const response = responseDouble([false, true, true]);
  registry.register({ session: SESSION_A, response });
  registry.send(SESSION_A, 'frame-1');
  registry.send(SESSION_A, 'frame-2');
  response.emit('drain');
  assert.deepEqual(response.frames, ['frame-1', 'frame-2']);
  assert.equal(heartbeatFrame(), ': heartbeat\n\n');
  assert.doesNotMatch(heartbeatFrame(), /data:/);
});
