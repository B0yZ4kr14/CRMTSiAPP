const test = require('node:test');
const assert = require('node:assert/strict');
const { can } = require('../rbac');
const { ROUTE_CAPABILITIES } = require('../route-capabilities');

test('route capability map keeps every authenticated mutation behind an explicit server-side permission', () => {
  assert.equal(ROUTE_CAPABILITIES['POST /inbox'], 'conversation:write');
  assert.equal(ROUTE_CAPABILITIES['POST /inbox/:id/messages'], 'conversation:write');
  assert.equal(ROUTE_CAPABILITIES['POST /inbox/:id/status'], 'conversation:write');
  assert.equal(ROUTE_CAPABILITIES['POST /inbox/:id/assignment'], 'conversation:write');
  assert.equal(ROUTE_CAPABILITIES['POST /inbox/:id/templates'], 'conversation:write');
  assert.equal(ROUTE_CAPABILITIES['POST /settings/channels'], 'settings:write');
  assert.equal(ROUTE_CAPABILITIES['POST /settings/team'], 'team:manage');
  assert.equal(ROUTE_CAPABILITIES['POST /settings/queues'], 'queue:manage');
  assert.equal(ROUTE_CAPABILITIES['POST /settings/templates'], 'template:manage');
  assert.equal(can('agent', ROUTE_CAPABILITIES['POST /settings/channels']), false);
});
