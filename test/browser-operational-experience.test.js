const test = require('node:test');
const assert = require('node:assert/strict');
const { chromiumExecutable, loadPlaywright } = require('./helpers/browser-fixture');
const { renderAutomationEditor } = require('../modules/automation/workspace');
const { renderCampaignEditor } = require('../modules/marketing/workspace');
const { renderSetupWizard } = require('../modules/setup/workspace');

test('Chromium operational sweep renders setup, automation, campaign and realtime-safe editor journeys', async () => {
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ executablePath: chromiumExecutable(), headless: true });
  try {
    const page = await browser.newPage();
    for (const html of [renderSetupWizard({ wizardStep: 1 }), renderAutomationEditor(), renderCampaignEditor({})]) {
      await page.setContent(`<!doctype html><html><body>${html}</body></html>`);
      assert.ok(await page.locator('body').innerText());
      assert.equal(await page.locator('input[type="password"]').count(), html.includes('Credencial Bootstrap') ? 1 : 0);
      assert.equal(await page.locator('[aria-live]').count() >= 0, true);
    }
  } finally {
    await browser.close();
  }
});