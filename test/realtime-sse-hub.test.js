const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createSseHub } = require('../modules/realtime/sse-hub');

function responseDouble() {
  const response = new EventEmitter();
  response.frames = [];
  response.write = frame => { response.frames.push(frame); return true; };
  response.end = () => { response.ended = true; };
  return response;
}

const event = {
  sequence: 12,
  eventType: 'inbox.conversation.updated',
  payload: { eventId: 'event-12', aggregate: { type: 'conversation', id: 'c1', version: 2 } },
  audience: { teamIds: ['team-a'], capabilities: ['conversation:read'] },
};

test('SSE hub broadcasts only inside the tenant and authorized audience', async () => {
  const hub = createSseHub({ authorize: async () => true });
  const allowed = responseDouble();
  const wrongTeam = responseDouble();
  const otherTenant = responseDouble();
  hub.register({ response: allowed, session: { tenantId: 'tenant-a', userId: 'u1', teamIds: ['team-a'], capabilities: ['conversation:read'] } });
  hub.register({ response: wrongTeam, session: { tenantId: 'tenant-a', userId: 'u2', teamIds: ['team-b'], capabilities: ['conversation:read'] } });
  hub.register({ response: otherTenant, session: { tenantId: 'tenant-b', userId: 'u3', teamIds: ['team-a'], capabilities: ['conversation:read'] } });

  const delivered = await hub.publish({ tenantId: 'tenant-a', event });
  assert.equal(delivered, 1);
  assert.equal(allowed.frames.length, 1);
  assert.equal(wrongTeam.frames.length, 0);
  assert.equal(otherTenant.frames.length, 0);
});

test('SSE hub revalidates authorization and closes revoked sessions with a final event', async () => {
  let authorized = true;
  const hub = createSseHub({ authorize: async () => authorized });
  const response = responseDouble();
  hub.register({ response, session: { tenantId: 'tenant-a', userId: 'u1', teamIds: ['team-a'], capabilities: ['conversation:read'] } });
  authorized = false;

  const delivered = await hub.publish({ tenantId: 'tenant-a', event });
  assert.equal(delivered, 0);
  assert.equal(response.ended, true);
  assert.match(response.frames.join(''), /system\.permission-revoked/);
  assert.equal(hub.connectionCount({ tenantId: 'tenant-a', userId: 'u1' }), 0);
});

test('SSE hub registers and removes connections idempotently', () => {
  const hub = createSseHub({ authorize: async () => true });
  const response = responseDouble();
  const remove = hub.register({ response, session: { tenantId: 'tenant-a', userId: 'u1', teamIds: [], capabilities: ['conversation:read'] } });
  assert.equal(hub.connectionCount({ tenantId: 'tenant-a', userId: 'u1' }), 1);
  remove();
  remove();
  assert.equal(hub.connectionCount({ tenantId: 'tenant-a', userId: 'u1' }), 0);
});
