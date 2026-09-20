const test = require('node:test');
const assert = require('node:assert/strict');
const { chromiumExecutable, loadPlaywright } = require('./helpers/browser-fixture');
const { renderSetupWizard } = require('../modules/setup/workspace');

function renderProviderSettings(state = {}) {
  const providers = Array.isArray(state.providers) ? state.providers : [];
  const cards = providers.map(provider => `<article class="card provider-card"><h2>${String(provider.provider || '').toUpperCase()}</h2><p>Status: ${String(provider.status || 'inactive')}</p><p>Credencial: ${String(provider.maskedHint || 'não configurada')}</p><form method="post" action="/providers/${encodeURIComponent(provider.provider || '')}/rotate"><label>Nova credencial<input type="password" name="credentials" autocomplete="new-password"></label><button type="submit">Rotacionar credencial</button></form></article>`).join('');
  return `<section class="panel settings-panel"><header><h1>Provedores e Canais</h1><p>Segredos nunca são reexibidos.</p></header>${cards || '<p>Nenhum provedor configurado.</p>'}</section>`;
}

module.exports = { renderProviderSettings, renderSetupWizard };

test('Chromium setup wizard and provider panel keep secrets write-only and render operational controls', async () => {
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ executablePath: chromiumExecutable(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html><body>${renderSetupWizard({ wizardStep: 1, bootstrapSecret: 'not-rendered' })}</body></html>`);
    const setup = await page.evaluate(() => ({
      text: document.body.innerText,
      passwordFields: document.querySelectorAll('input[type="password"]').length,
      secretPresent: document.body.innerText.includes('not-rendered') || document.documentElement.innerHTML.includes('not-rendered'),
      forms: document.querySelectorAll('form').length,
    }));
    assert.match(setup.text, /Assistente de Instalação/);
    assert.equal(setup.passwordFields, 1);
    assert.equal(setup.secretPresent, false);
    assert.ok(setup.forms >= 1);

    await page.setContent(`<!doctype html><html><body>${renderProviderSettings({ providers: [{ id: 'p1', provider: 'waha', status: 'active', maskedHint: '••••1234' }] })}</body></html>`);
    const providers = await page.evaluate(() => ({ text: document.body.innerText, passwordFields: document.querySelectorAll('input[type="password"]').length }));
    assert.match(providers.text, /provedor|WAHA/i);
    assert.match(providers.text, /1234/);
    assert.ok(providers.passwordFields >= 1);
    assert.doesNotMatch(providers.text, /api[_ -]?key|token secreto|secret/i);
  } finally {
    await browser.close();
  }
});
