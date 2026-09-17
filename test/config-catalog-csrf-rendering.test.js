const test = require('node:test');
const assert = require('node:assert/strict');
const { renderConfigCatalog } = require('../config-catalog');

test('catalog renders no CSRF-bearing mutation when no setting has a runtime consumer', () => {
  const html = renderConfigCatalog({}, { csrfToken: 'csrf.catalog.token' });
  assert.doesNotMatch(html, /action="\/settings\/catalog"/);
  assert.doesNotMatch(html, /name="csrf_token"/);
});
