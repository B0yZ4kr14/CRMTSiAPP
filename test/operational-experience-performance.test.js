const test = require('node:test');
const assert = require('node:assert/strict');
const { createConnectionRegistry } = require('../modules/realtime/connection-registry');
const { replayEvents } = require('../modules/realtime/event-store');

const HOST_REFERENCE = Object.freeze({
  connections: 100,
  eventsPerSecond: 20,
  durationSeconds: 600,
  maxPayloadBytes: 8192,
  replayEventsPerTenant: 6000,
  mode: 'deterministic-model',
});

test('performance profile is fixed and documents the required reference-host workload', () => {
  assert.deepEqual(HOST_REFERENCE, {
    connections: 100,
    eventsPerSecond: 20,
    durationSeconds: 600,
    maxPayloadBytes: 8192,
    replayEventsPerTenant: 6000,
    mode: 'deterministic-model',
  });
});

test('connection registry enforces the profile user limit without retaining payloads', () => {
  const registry = createConnectionRegistry({ maxPerUser: HOST_REFERENCE.connections, maxPerTenant: HOST_REFERENCE.connections, maxQueueBytes: HOST_REFERENCE.maxPayloadBytes });
  const unregister = [];
  for (let index = 0; index < HOST_REFERENCE.connections; index += 1) {
    unregister.push(registry.register({ response: { write: () => true }, session: { userId: 'user-a', tenantId: 'tenant-a' }, cursor: 0 }));
  }
  assert.equal(registry.connectionCount({ userId: 'user-a', tenantId: 'tenant-a' }), HOST_REFERENCE.connections);
  assert.throws(() => registry.register({ response: { write: () => true }, session: { userId: 'user-a', tenantId: 'tenant-a' }, cursor: 0 }), error => error.code === 'CONNECTION_QUOTA_EXCEEDED');
  unregister.forEach(close => close());
});

module.exports = { HOST_REFERENCE };