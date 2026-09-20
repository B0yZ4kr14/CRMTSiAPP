const test = require('node:test');
const assert = require('node:assert/strict');
const fixture = require('./fixtures/metric-events');
const { METRIC_CATALOG_VERSION, METRICS } = require('../modules/reporting/metric-definitions');
const { summarizeMetrics } = require('../modules/reporting/metric-service');

test('metric catalog is versioned and fixed fixture reconciles counts and percentile denominators', () => {
  assert.equal(METRIC_CATALOG_VERSION, fixture.version);
  assert.equal(METRICS.firstResponseMs.denominator, 'matching response events with durationMs >= 0');
  const report = summarizeMetrics(fixture.events, {
    tenantId: '11111111-1111-4111-8111-111111111111',
    from: '2026-09-19T00:00:00.000Z',
    to: '2026-09-20T00:00:00.000Z',
    timezone: fixture.timezone,
  });
  assert.deepEqual(report.counts, { opened: 1, resolved: 1 });
  assert.deepEqual(report.firstResponseMs, { count: 2, p50: 2000, p90: 2800, p95: 2900 });
  assert.deepEqual(report.resolutionMs, { count: 1, p50: 5000, p90: 5000, p95: 5000 });
});

test('metric dimensions and time window are tenant-safe and reject unknown timezone', () => {
  assert.throws(() => summarizeMetrics(fixture.events, { tenantId: '11111111-1111-4111-8111-111111111111', timezone: 'invalid/timezone' }), /timezone/i);
  const report = summarizeMetrics(fixture.events, {
    tenantId: '11111111-1111-4111-8111-111111111111',
    from: '2026-09-19T00:00:00.000Z',
    to: '2026-09-20T00:00:00.000Z',
    dimensions: { channel: 'meta' },
    timezone: fixture.timezone,
  });
  assert.deepEqual(report.counts, { opened: 0, resolved: 0 });
  assert.equal(report.firstResponseMs.count, 0);
});
