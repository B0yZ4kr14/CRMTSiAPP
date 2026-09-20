const test = require('node:test');
const assert = require('node:assert/strict');
const { encodeCursor, decodeCursor } = require('../modules/shared/pagination');
const { validateString, validateUuid } = require('../modules/shared/validation');

test('pagination keyset cursor encodes and decodes correctly', () => {
  const cursor = encodeCursor({ id: '123', createdAt: '2026-09-19T00:00:00.000Z' });
  const decoded = decodeCursor(cursor);
  assert.equal(decoded.id, '123');
  assert.equal(decoded.createdAt, '2026-09-19T00:00:00.000Z');
});

test('validation helpers validate strings and uuids safely', () => {
  assert.equal(validateString('hello', { maxLen: 10 }), 'hello');
  assert.throws(() => validateString('   ', { required: true }), /required/);
  assert.equal(validateUuid('00000000-0000-4000-8000-000000000001'), '00000000-0000-4000-8000-000000000001');
  assert.throws(() => validateUuid('not-a-uuid'), /invalid uuid/);
});
