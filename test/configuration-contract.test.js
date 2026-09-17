const test = require('node:test');
const assert = require('node:assert/strict');
const { CONFIGURATION_CONTRACT, editableSettings, isEditableSetting } = require('../configuration-contract');
const { renderConfigCatalog, validateConfigValue } = require('../config-catalog');

test('catalog exposes only settings with a real runtime consumer as editable', () => {
  assert.deepEqual(editableSettings(), []);
  assert.equal(isEditableSetting('session_ttl_days'), false);
  assert.equal(isEditableSetting('app_url'), false);
  assert.ok(CONFIGURATION_CONTRACT.every((item) => item.status !== 'effective'));
});

test('unsupported settings are visible as planned but cannot be submitted', () => {
  const html = renderConfigCatalog({}, { csrfToken: 'csrf' });
  assert.match(html, /Planejado — sem efeito no runtime/);
  assert.doesNotMatch(html, /action="\/settings\/catalog"/);
  assert.equal(validateConfigValue('session_ttl_days', '14').ok, false);
});
