const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTemplateVariables, templateMessageBody } = require('../template-delivery');

test('template delivery accepts exactly the approved number of bounded variables', () => {
  assert.deepEqual(parseTemplateVariables('Ana\n09:00', 2), ['Ana', '09:00']);
  assert.equal(templateMessageBody('retorno_inicial'), 'Template: retorno_inicial');
});

test('template delivery rejects missing, excess and malformed variables before outbox enqueue', () => {
  assert.throws(() => parseTemplateVariables('Ana', 2), /quantidade/i);
  assert.throws(() => parseTemplateVariables('Ana\n09:00', 1), /quantidade/i);
  assert.throws(() => parseTemplateVariables('x'.repeat(1025), 1), /variável/i);
});
