const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuthenticatedApp } = require('./helpers/authenticated-app');

test('status workspace exposes tenant alert state and acknowledgement remains CSRF/capability gated', async () => {
  await withAuthenticatedApp(async ({ request, cookie }) => {
    const response = await request('/status');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Status operacional/);
    assert.match(html, /<aside class="sidebar" aria-label="Navegação principal">/);
    assert.match(html, /href="\/settings\/start"[^>]*>Configurações/);
    assert.match(html, /class="nav-item active"[^>]*aria-current="page"[^>]*>Status operacional/);
    const denied = await request('/status/alerts/alert-a/acknowledge', {
      method: 'POST', headers: { cookie, origin: 'http://127.0.0.1:0', 'content-type': 'application/x-www-form-urlencoded' }, body: 'csrf_token=invalid',
    });
    assert.equal(denied.status, 403);
  }, {
    queryHandler(sql) {
      if (String(sql).toLowerCase().includes('from alert_instances')) return { rows: [], rowCount: 0 };
      return null;
    },
  });
});
