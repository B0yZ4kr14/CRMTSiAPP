const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createSseRoute } = require('../modules/realtime/routes');

function responseDouble() {
  const response = new EventEmitter();
  response.headers = {};
  response.body = '';
  response.statusCode = 200;
  response.setHeader = (name, value) => { response.headers[name.toLowerCase()] = value; };
  response.writeHead = (status, headers = {}) => {
    response.statusCode = status;
    for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  };
  response.write = chunk => { response.body += String(chunk); return true; };
  response.end = chunk => { if (chunk) response.body += String(chunk); response.ended = true; };
  response.flushHeaders = () => {};
  return response;
}

function requestDouble(overrides = {}) {
  const request = new EventEmitter();
  return Object.assign(request, {
    method: 'GET',
    url: '/events?topics=inbox,notifications',
    headers: { accept: 'text/event-stream' },
    session: null,
  }, overrides);
}

function dependencies(overrides = {}) {
  return {
    authenticate: async request => request.session,
    authorize: async () => true,
    eventStore: {
      currentSequence: async () => 0,
      replay: async () => ({ events: [], cursorExpired: false }),
    },
    hub: {
      register: () => () => {},
      connectionCount: () => 0,
    },
    heartbeatMs: 60_000,
    maxConnectionsPerUser: 2,
    ...overrides,
  };
}

test('SSE contract returns 401 without a current secure session', async () => {
  const route = createSseRoute(dependencies());
  const response = responseDouble();
  await route(requestDouble(), response);
  assert.equal(response.statusCode, 401);
  assert.match(response.body, /AUTHENTICATION_REQUIRED/);
});

test('SSE contract returns 403 when realtime capability is denied', async () => {
  const route = createSseRoute(dependencies({ authorize: async () => false }));
  const response = responseDouble();
  await route(requestDouble({ session: { userId: 'user-a', tenantId: 'tenant-a' } }), response);
  assert.equal(response.statusCode, 403);
});

test('SSE contract returns 409 for a future cursor', async () => {
  const route = createSseRoute(dependencies({
    eventStore: { currentSequence: async () => 3, replay: async () => ({ events: [], cursorExpired: false }) },
  }));
  const response = responseDouble();
  await route(requestDouble({
    session: { userId: 'user-a', tenantId: 'tenant-a' },
    headers: { accept: 'text/event-stream', 'last-event-id': '4' },
  }), response);
  assert.equal(response.statusCode, 409);
});

test('SSE contract returns 429 when the user connection quota is exhausted', async () => {
  const route = createSseRoute(dependencies({ hub: { register: () => () => {}, connectionCount: () => 2 } }));
  const response = responseDouble();
  await route(requestDouble({ session: { userId: 'user-a', tenantId: 'tenant-a' } }), response);
  assert.equal(response.statusCode, 429);
  assert.equal(response.headers['retry-after'], '5');
});

test('SSE contract returns 503 when durable replay is unavailable', async () => {
  const route = createSseRoute(dependencies({ eventStore: {
    currentSequence: async () => { throw new Error('database unavailable'); },
    replay: async () => ({ events: [], cursorExpired: false }),
  } }));
  const response = responseDouble();
  await route(requestDouble({ session: { userId: 'user-a', tenantId: 'tenant-a' } }), response);
  assert.equal(response.statusCode, 503);
  assert.doesNotMatch(response.body, /database unavailable/);
});

test('SSE contract opens a no-cache stream, replays ordered frames, and emits heartbeat comments', async t => {
  let heartbeat;
  t.mock.timers.enable({ apis: ['setInterval'] });
  const route = createSseRoute(dependencies({
    eventStore: {
      currentSequence: async () => 9,
      replay: async () => ({
        cursorExpired: false,
        events: [{ sequence: 9, eventType: 'inbox.message.created', payload: { eventId: 'event-9' } }],
      }),
    },
    setHeartbeat: fn => { heartbeat = fn; return 1; },
    clearHeartbeat: () => {},
  }));
  const response = responseDouble();
  await route(requestDouble({ session: { userId: 'user-a', tenantId: 'tenant-a' } }), response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['content-type'], 'text/event-stream; charset=utf-8');
  assert.equal(response.headers['cache-control'], 'no-cache, no-transform');
  assert.equal(response.headers.connection, 'keep-alive');
  assert.equal(response.headers['x-accel-buffering'], 'no');
  assert.match(response.body, /id: 9\nevent: inbox\.message\.created\ndata: /);
  heartbeat();
  assert.match(response.body, /: heartbeat\n\n/);
});
