const test = require('node:test');
const assert = require('node:assert/strict');
const { createAutomationRoutes } = require('../modules/automation/routes');

function response() {
  return { status: null, body: null, writeHead(status) { this.status = status; }, end(body) { this.body = JSON.parse(body); } };
}

const graph = { nodes: [{ id: 'start', type: 'trigger.conversation_opened', config: {} }, { id: 'assign', type: 'action.assign_queue', config: { queueId: 'q' } }], edges: [{ from: 'start', to: 'assign', port: 'next' }] };
const user = { tenantId: 'tenant-a' };

test('automation editor contracts create validate simulate publish and restore drafts', async () => {
  const routes = createAutomationRoutes();
  const created = response();
  await routes.createDraft({ user, body: { name: 'Rule', graph } }, created);
  assert.equal(created.status, 201);
  const id = created.body.id;

  const validation = response();
  await routes.validate({ user, body: { graph } }, validation);
  assert.equal(validation.status, 200);
  assert.equal(validation.body.valid, true);

  const simulation = response();
  await routes.simulate({ user, body: { graph, event: { id: 'e1', type: 'conversation.opened', data: {} } } }, simulation);
  assert.equal(simulation.status, 200);
  assert.equal(simulation.body.status, 'simulated');

  const published = response();
  await routes.publish({ user, params: { id }, body: { revision: 1 } }, published);
  assert.equal(published.status, 200);
  assert.equal(published.body.version, 1);

  const restored = response();
  await routes.restore({ user, params: { id }, body: { version: 1 } }, restored);
  assert.equal(restored.status, 201);
  assert.equal(restored.body.version, 2);
});