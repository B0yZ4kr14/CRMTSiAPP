const test = require('node:test');
const assert = require('node:assert/strict');
const { validateField } = require('../modules/crm/schema-service');

test('schema service validates custom field types', () => {
  assert.equal(validateField({ type: 'text', value: 'hello' }), true);
  assert.equal(validateField({ type: 'number', value: 'not-a-number' }), false);
});
