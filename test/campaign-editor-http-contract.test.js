const test = require('node:test');
const assert = require('node:assert/strict');
const { createCampaignRoutes } = require('../modules/marketing/routes');

function response() {
  return { status: null, body: null, writeHead(status) { this.status = status; }, end(body) { this.body = JSON.parse(body); } };
}
const user = { tenantId: 'tenant-a' };
const content = { blocks: [{ type: 'paragraph', text: 'Olá {{contact.name}}' }] };

test('campaign editor contracts create preview publish and restore drafts', async () => {
  const routes = createCampaignRoutes();
  const created = response();
  await routes.createDraft({ user, body: { name: 'Campanha', channel: 'waha', content } }, created);
  assert.equal(created.status, 201);
  const id = created.body.id;

  const preview = response();
  await routes.preview({ body: { channel: 'waha', content, variables: { 'contact.name': 'Ana' } } }, preview);
  assert.equal(preview.status, 200);
  assert.match(preview.body.html, /Ana/);

  const published = response();
  await routes.publish({ user, params: { id }, body: { revision: 1 } }, published);
  assert.equal(published.status, 200);
  assert.equal(published.body.version, 1);

  const restored = response();
  await routes.restore({ user, params: { id }, body: { version: 1 } }, restored);
  assert.equal(restored.status, 201);
  assert.equal(restored.body.version, 2);
});