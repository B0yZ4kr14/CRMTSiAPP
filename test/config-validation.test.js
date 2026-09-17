const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_SETTINGS, validateConfigValue } = require('../config-catalog');

test('uses canonical defaults for core local CRM settings', () => {
  assert.equal(DEFAULT_SETTINGS.app_url, 'https://crm.tsiapp.io');
  assert.equal(DEFAULT_SETTINGS.organization_currency, 'BRL');
  assert.equal(DEFAULT_SETTINGS.organization_locale, 'pt-BR');
  assert.equal(DEFAULT_SETTINGS.whatsapp_provider, 'none');
});

test('rejects persistence for catalog settings without a runtime consumer', () => {
  for (const [key, value] of [['organization_currency', 'USD'], ['mfa_required_for_admins', 'true'], ['meta_graph_version', 'v22.0'], ['app_url', 'https://crm.tsiapp.io']]) {
    assert.equal(validateConfigValue(key, value).ok, false);
  }
});

test('rejects secrets and malformed catalog values before persistence', () => {
  assert.equal(validateConfigValue('organization_currency', 'usd').ok, false);
  assert.equal(validateConfigValue('mfa_required_for_admins', 'maybe').ok, false);
  assert.equal(validateConfigValue('meta_graph_version', '<script>').ok, false);
  assert.equal(validateConfigValue('app_url', 'javascript:alert(1)').ok, false);
  assert.equal(validateConfigValue('waha_api_key', 'secret').ok, false);
});
