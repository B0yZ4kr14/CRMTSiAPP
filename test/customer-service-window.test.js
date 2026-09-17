const test = require('node:test');
const assert = require('node:assert/strict');
const { customerServiceWindow, isFreeformMessageAllowed } = require('../customer-service-window');

const NOW = new Date('2026-09-17T15:00:00.000Z');

test('Meta free-form delivery is available only inside the 24-hour customer-service window', () => {
  const open = customerServiceWindow({ provider: 'meta', lastInboundAt: '2026-09-16T15:00:01.000Z', now: NOW });
  assert.equal(open.open, true);
  assert.equal(open.expiresAt.toISOString(), '2026-09-17T15:00:01.000Z');

  const expired = customerServiceWindow({ provider: 'meta', lastInboundAt: '2026-09-16T15:00:00.000Z', now: NOW });
  assert.equal(expired.open, false);
  assert.equal(expired.expiresAt.toISOString(), '2026-09-17T15:00:00.000Z');
});

test('local and WAHA conversations do not inherit Meta template policy', () => {
  assert.equal(isFreeformMessageAllowed({ provider: 'waha', lastInboundAt: null, now: NOW }), true);
  assert.equal(isFreeformMessageAllowed({ provider: null, lastInboundAt: null, now: NOW }), true);
  assert.equal(isFreeformMessageAllowed({ provider: 'meta', lastInboundAt: null, now: NOW }), false);
});
