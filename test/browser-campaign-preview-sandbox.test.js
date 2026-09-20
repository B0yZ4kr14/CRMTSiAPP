const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromiumExecutable, loadPlaywright } = require('./helpers/browser-fixture');
const { createPreviewFrame } = require('../modules/marketing/preview-frame');

test('Chromium campaign preview frame is sandboxed without same-origin and has restrictive CSP', async () => {
  const frame = createPreviewFrame({ content: { blocks: [{ type: 'paragraph', text: '<script>window.parentHacked=true</script>' }] }, channel: 'waha' });
  assert.equal(frame.sandbox, 'allow-scripts');
  assert.doesNotMatch(frame.sandbox, /allow-same-origin/);
  assert.match(frame.csp, /default-src 'none'/);
  assert.match(frame.csp, /frame-ancestors 'none'/);

  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ executablePath: chromiumExecutable(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><iframe id="preview" sandbox="${frame.sandbox}" srcdoc="${frame.html.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`);
    await page.waitForSelector('#preview');
    const sandbox = await page.locator('#preview').getAttribute('sandbox');
    assert.equal(sandbox, 'allow-scripts');
    assert.equal(await page.evaluate(() => Boolean(window.parentHacked)), false);
  } finally {
    await browser.close();
  }
});