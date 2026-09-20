const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdmin, resetAdminPassword } = require('../modules/cli/commands/admin');

test('admin command requires identity and never receives password through argv', async () => {
  await assert.rejects(() => createAdmin({ client: {}, tenantId: 'tenant-a', args: {} }), { code: 'ADMIN_IDENTITY_REQUIRED' });
  await assert.rejects(() => resetAdminPassword({ client: {}, tenantId: 'tenant-a', args: {} }), { code: 'ADMIN_IDENTITY_REQUIRED' });
});
