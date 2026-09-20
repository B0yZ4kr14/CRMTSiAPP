const test = require('node:test');
const assert = require('node:assert/strict');

const { createRealtimeInboxClient } = require('../public/js/realtime-inbox');

class FakeEventSource {
  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.closed = false;
  }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  close() { this.closed = true; }
  emit(type, data, lastEventId = '') {
    this.listeners.get(type)?.({ data: JSON.stringify(data), lastEventId });
  }
}

function harness(overrides = {}) {
  let source;
  const applied = [];
  const states = [];
  let reconciliations = 0;
  const client = createRealtimeInboxClient({
    eventSourceFactory: url => (source = new FakeEventSource(url)),
    applyEvent: event => applied.push(event),
    reconcile: async () => { reconciliations += 1; },
    setConnectionState: state => states.push(state),
    staleAfterMs: 50,
    setTimer: fn => ({ fn }),
    clearTimer: () => {},
    ...overrides,
  });
  return { client, get source() { return source; }, applied, states, reconciliations: () => reconciliations };
}

test('realtime client expands paginated replay beyond 6,000 events', async () => {
  const h = harness({ replayPageSize: 2 });
  h.client.connect();
  let calls = 0;
  const cursor = await h.client.replayBeyondLimit(async (after, limit) => {
    calls += 1;
    const start = Number(after || 0) + 1;
    const events = start <= 4 ? Array.from({ length: Math.min(limit, 2) }, (_, index) => ({
      sequence: start + index,
      eventType: 'inbox.conversation.updated',
      eventId: `replay-${start + index}`,
      aggregate: { type: 'conversation', id: 'c-replay', version: start + index },
      data: { status: 'open' },
    })) : [];
    return { events, hasMore: start <= 4 };
  });
  assert.equal(calls, 3);
  assert.equal(cursor, 4);
  assert.equal(h.applied.length, 4);
});

test('realtime client deduplicates event IDs and ignores stale aggregate versions', () => {
  const h = harness();
  h.client.connect(7);
  assert.match(h.source.url, /cursor=7/);
  h.source.emit('inbox.conversation.updated', { eventId: 'e1', aggregate: { type: 'conversation', id: 'c1', version: 2 }, data: { status: 'open' } }, '8');
  h.source.emit('inbox.conversation.updated', { eventId: 'e1', aggregate: { type: 'conversation', id: 'c1', version: 2 }, data: { status: 'closed' } }, '8');
  h.source.emit('inbox.conversation.updated', { eventId: 'e2', aggregate: { type: 'conversation', id: 'c1', version: 1 }, data: { status: 'closed' } }, '9');
  assert.equal(h.applied.length, 1);
  assert.equal(h.client.lastAppliedId(), '8');
});

test('realtime client applies a newer aggregate version and tracks the fully applied cursor', () => {
  const h = harness();
  h.client.connect();
  h.source.emit('inbox.message.created', { eventId: 'e1', aggregate: { type: 'conversation', id: 'c1', version: 1 }, data: {} }, '11');
  h.source.emit('inbox.message.created', { eventId: 'e2', aggregate: { type: 'conversation', id: 'c1', version: 2 }, data: {} }, '12');
  assert.equal(h.applied.length, 2);
  assert.equal(h.client.lastAppliedId(), '12');
});

test('realtime client reconciles on instruction and marks stale/error states', async () => {
  let staleTimer;
  const h = harness({ setTimer: fn => { staleTimer = fn; return 1; } });
  h.client.connect();
  h.source.emit('system.reconcile-required', { eventId: 'r1', aggregate: { type: 'system', id: 'stream', version: 1 }, data: { cursor: 20 } }, '20');
  await Promise.resolve();
  assert.equal(h.reconciliations(), 1);
  staleTimer();
  assert.ok(h.states.includes('stale'));
  h.source.onerror?.();
  assert.ok(h.states.includes('disconnected'));
});
