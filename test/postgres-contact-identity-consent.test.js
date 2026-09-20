const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeIdentity } = require('../modules/crm/contact-service');

test('contact identity normalizes phone and email inputs', () => {
  const contact = normalizeIdentity({ email: 'User@Example.com ', phone: ' 55 11 99999-9999 ' });
  assert.equal(contact.email, 'user@example.com');
  assert.equal(contact.phone, '5511999999999');
});
