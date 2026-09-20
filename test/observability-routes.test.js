const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuthenticatedApp } = require('./helpers/authenticated-app');

test('live endpoint is process-only while ready reflects database and queued-work readiness', async () => {
  await withAuthenticatedApp(async ({ request }) => {
    const live = await request('/live');
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { ok: true, status: 'live' });
    const ready = await request('/ready');
    const body = await ready.json();
    assert.ok([200, 503].includes(ready.status));
    assert.equal(body.ok, ready.status === 200);
    assert.ok(['ok', 'degraded'].includes(body.status));
    assert.ok(body.traceId);
  });
});
