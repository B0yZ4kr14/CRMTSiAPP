const test = require('node:test');
const assert = require('node:assert/strict');
const { renderConfigCatalog } = require('../config-catalog');

test('unsupported catalog settings remain visible without editable controls', () => {
  const html = renderConfigCatalog({});
  assert.match(html, /Provedor de canal/);
  assert.match(html, /Planejado — sem efeito no runtime/);
  assert.doesNotMatch(html, /name="key" value="whatsapp_provider"/);
  assert.doesNotMatch(html, /type="number"/);
});
