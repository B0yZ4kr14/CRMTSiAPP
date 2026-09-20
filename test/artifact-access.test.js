const test = require('node:test');
const assert = require('node:assert/strict');
const { createArtifactMetadata } = require('../modules/operations/artifact-service');

test('artifact service generates metadata with tenant and expiry', () => {
  const meta = createArtifactMetadata({ ownerId: 'user-a', tenantId: 'tenant-1', expiresAt: new Date(Date.now() + 10000) });
  assert.equal(meta.ownerId, 'user-a');
  assert.equal(meta.tenantId, 'tenant-1');
  assert.ok(meta.expiresAt instanceof Date);
});
