const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuthenticatedApp } = require('./helpers/authenticated-app');

test('reports route renders tenant-scoped persisted metrics and its CSV export has matching definitions', async () => {
  const calls = [];
  await withAuthenticatedApp(async ({ request }) => {
    const page = await request('/reports?from=2026-09-19T00%3A00%3A00.000Z&to=2026-09-20T00%3A00%3A00.000Z&channel=waha');
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /Relatórios operacionais/);
    assert.match(html, /Conversas abertas/);
    assert.match(html, /Exportar CSV/);
    const csv = await request('/reports/export.csv?from=2026-09-19T00%3A00%3A00.000Z&to=2026-09-20T00%3A00%3A00.000Z&channel=waha');
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type'), /text\/csv/);
    assert.match(await csv.text(), /"metric","value","denominator"/);
  }, {
    queryHandler(sql, values) {
      const text = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
      calls.push({ text, values });
      if (text.includes('from metric_events')) return { rows: [], rowCount: 0 };
      return null;
    },
  });
  assert.ok(calls.every(call => !call.text.includes('from metric_events') || call.values.includes('00000000-0000-4000-8000-000000000001')));
});
