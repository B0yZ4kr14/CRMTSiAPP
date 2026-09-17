const test = require('node:test');
const assert = require('node:assert/strict');
const { serializeTemplatePayload } = require('../channel-adapter');

test('template payload uses the approved Meta template contract with explicit language and variables', () => {
  assert.deepEqual(serializeTemplatePayload({ name: 'retorno_inicial', language: 'pt_BR', variables: ['Ana', '09:00'] }), {
    type: 'template',
    template: {
      name: 'retorno_inicial',
      language: { code: 'pt_BR' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'Ana' }, { type: 'text', text: '09:00' }] }],
    },
  });
});

test('template payload rejects unapproved shapes before provider delivery', () => {
  assert.throws(() => serializeTemplatePayload({ name: '', language: 'pt_BR' }), /template name/i);
  assert.throws(() => serializeTemplatePayload({ name: 'ok', language: 'bad value' }), /language/i);
  assert.throws(() => serializeTemplatePayload({ name: 'ok', language: 'pt_BR', variables: Array(101).fill('x') }), /variables/i);
});
