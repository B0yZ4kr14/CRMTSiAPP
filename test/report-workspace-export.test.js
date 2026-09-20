const test = require('node:test');
const assert = require('node:assert/strict');
const { createReportWorkspace, createCsvExport } = require('../modules/reporting/workspace');
const { summarizeMetrics } = require('../modules/reporting/metric-service');
const fixture = require('./fixtures/metric-events');

const context = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  from: '2026-09-19T00:00:00.000Z',
  to: '2026-09-20T00:00:00.000Z',
  timezone: 'America/Sao_Paulo',
};

test('report workspace uses the same metric definition for filters, view, and export', () => {
  const report = summarizeMetrics(fixture.events, context);
  const page = createReportWorkspace({ report, filters: { ...context, dimensions: { channel: 'waha' } } });
  assert.match(page, /Relatórios operacionais/);
  assert.match(page, /America\/Sao_Paulo/);
  assert.match(page, /Canal/);
  const csv = createCsvExport(report, context);
  assert.match(csv, /^"metric","value","denominator"\n/);
  assert.match(csv, /"opened","1","all matching events"/);
  assert.match(csv, /"first_response_p95_ms","2900","matching response events with durationMs >= 0"/);
});

test('export refuses another tenant report and never emits unscoped data', () => {
  const report = summarizeMetrics(fixture.events, context);
  assert.throws(() => createCsvExport(report, { ...context, tenantId: '22222222-2222-4222-8222-222222222222' }), /tenant/i);
});
