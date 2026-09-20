const test = require('node:test');
const assert = require('node:assert/strict');
const { previewMerge } = require('../modules/crm/merge-service');

test('merge service previews contact deduplication and field combination', () => {
  const merged = previewMerge({ primary: { name: 'Ana' }, secondary: { email: 'ana@example.com' } });
  assert.equal(merged.name, 'Ana');
  assert.equal(merged.email, 'ana@example.com');
});
