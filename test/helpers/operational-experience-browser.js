const { TENANT_A, TENANT_B } = require('../fixtures/tenant-matrix');
const { withChromium } = require('./browser-fixture');

function createBrowserJourneyFixture() {
  const metrics = [];
  return {
    tenants: {
      a: { id: TENANT_A, marker: 'tenant-a-only' },
      b: { id: TENANT_B, marker: 'tenant-b-only' },
    },
    metrics,
    recordMetric(name, value, dimensions = {}) {
      if (!name) throw new Error('metric name is required');
      if (!Number.isFinite(value) || value < 0) throw new Error('metric value must be finite non-negative');
      const metric = { name, value, dimensions: { ...dimensions }, recordedAt: new Date().toISOString() };
      metrics.push(metric);
      return metric;
    },
  };
}

async function withOperationalChromium(fn, options = {}) {
  const fixture = createBrowserJourneyFixture();
  return withChromium(context => fn({ ...context, fixture }), options);
}

module.exports = { createBrowserJourneyFixture, withOperationalChromium };
