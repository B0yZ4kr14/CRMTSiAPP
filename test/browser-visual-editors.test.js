const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromiumExecutable, loadPlaywright } = require('./helpers/browser-fixture');

test('Chromium visual editor supports keyboard-equivalent ordering and aria-live feedback', async () => {
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ executablePath: chromiumExecutable(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><main><div id="status" role="status" aria-live="polite"></div><ol id="nodes"></ol></main>');
    await page.addScriptTag({ path: path.join(__dirname, '..', 'public/js/automation-editor.js') });
    const result = await page.evaluate(() => {
      const client = window.CrmAutomationEditor.createAutomationEditor({
        announce: value => { document.querySelector('#status').textContent = value; },
        onChange: graph => { document.querySelector('#nodes').textContent = graph.nodes.map(node => node.id).join(','); },
      });
      client.addNode({ id: 'start', type: 'trigger.conversation_opened', config: {} });
      client.addNode({ id: 'assign', type: 'action.assign_queue', config: { queueId: 'q' } });
      client.connect('start', 'assign');
      client.moveNode('assign', -1);
      return { graph: client.graph(), status: document.querySelector('#status').textContent, list: document.querySelector('#nodes').textContent };
    });
    assert.equal(result.graph.edges.length, 1);
    assert.equal(result.graph.nodes[0].id, 'assign');
    assert.match(result.status, /posição 1/);
    assert.equal(result.list, 'assign,start');
  } finally {
    await browser.close();
  }
});