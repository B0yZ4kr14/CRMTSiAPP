const test = require('node:test');
const assert = require('node:assert/strict');
const { canScope } = require('../modules/identity/authorization-service');

test('canScope checks role and resource scope ownership correctly', async () => {
  const allowed = await canScope({ tenantId: 't1', actorId: 'agent-1', capabilities: ['read'] }, 'read', { tenantId: 't1' });
  assert.equal(allowed, true);

  const denied = await canScope({ tenantId: 't1', actor: { role: 'agent' } }, 'read', { tenantId: 't2' });
  assert.equal(denied, false);
});
