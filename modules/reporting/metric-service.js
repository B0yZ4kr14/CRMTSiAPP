const { METRIC_CATALOG_VERSION } = require('./metric-definitions');

function percentile(values, rank) {
  if (values.length === 0) return null;
  const position = (values.length - 1) * rank;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return values[lower];
  return values[lower] + ((values[upper] - values[lower]) * (position - lower));
}

function validateTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    throw new Error('timezone is invalid');
  }
}

function summarizeMetrics(events, options = {}) {
  const tenantId = String(options.tenantId || '').trim();
  if (!tenantId) throw new Error('tenantId is required');
  const timezone = options.timezone || 'UTC';
  validateTimezone(timezone);
  const from = options.from ? new Date(options.from).getTime() : Number.NEGATIVE_INFINITY;
  const to = options.to ? new Date(options.to).getTime() : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(from) && options.from) throw new Error('from timestamp is invalid');
  if (!Number.isFinite(to) && options.to) throw new Error('to timestamp is invalid');
  const dimensions = options.dimensions || {};
  const matching = (events || []).filter(event => {
    const occurredAt = new Date(event.occurredAt).getTime();
    return event.tenantId === tenantId && occurredAt >= from && occurredAt < to
      && Object.entries(dimensions).every(([key, value]) => event[key] === value);
  });
  const durations = type => matching.filter(event => event.type === type && Number.isFinite(event.durationMs))
    .map(event => event.durationMs).sort((a, b) => a - b);
  const summary = values => ({ count: values.length, p50: percentile(values, .5), p90: percentile(values, .9), p95: percentile(values, .95) });
  return Object.freeze({
    catalogVersion: METRIC_CATALOG_VERSION,
    tenantId,
    timezone,
    counts: Object.freeze({
      opened: matching.filter(event => event.type === 'conversation.opened').length,
      resolved: matching.filter(event => event.type === 'conversation.resolved').length,
    }),
    firstResponseMs: Object.freeze(summary(durations('conversation.first_response'))),
    resolutionMs: Object.freeze(summary(durations('conversation.resolved'))),
  });
}

module.exports = { summarizeMetrics, percentile };
