const test = require('node:test');
const assert = require('node:assert/strict');

const { withTransaction } = require('../modules/shared/transaction');
const { requireMatchingVersion, versionEtag } = require('../modules/shared/optimistic-lock');
const { requestFingerprint } = require('../modules/shared/idempotency-service');

test('transaction commits successful work and releases the client', async () => {
  const calls = [];
  const client = { query: async sql => calls.push(sql), release: () => calls.push('release') };
  const result = await withTransaction({ connect: async () => client }, async () => 'ok');
  assert.equal(result, 'ok');
  assert.deepEqual(calls, ['begin', 'commit', 'release']);
});

test('transaction rolls back and sanitizes unknown causes', async () => {
  const calls = [];
  const client = { query: async sql => calls.push(sql), release: () => calls.push('release') };
  await assert.rejects(
    withTransaction({ connect: async () => client }, async () => { throw new Error('password=backend-secret'); }),
    error => error.code === 'INTERNAL_ERROR' && error.message === 'transaction failed' && !error.message.includes('backend-secret'),
  );
  assert.deepEqual(calls, ['begin', 'rollback', 'release']);
});

test('optimistic lock and idempotency primitives are deterministic', () => {
  assert.equal(requireMatchingVersion(3, '"3"'), 3);
  assert.equal(versionEtag(3), '"3"');
  assert.throws(() => requireMatchingVersion(3, '"2"'), error => error.code === 'VERSION_CONFLICT');
  assert.equal(requestFingerprint({ a: 1 }), requestFingerprint({ a: 1 }));
  assert.notEqual(requestFingerprint({ a: 1 }), requestFingerprint({ a: 2 }));
});
