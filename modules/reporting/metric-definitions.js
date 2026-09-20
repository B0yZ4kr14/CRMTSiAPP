const METRIC_CATALOG_VERSION = '2026-09-20.1';

const METRICS = Object.freeze({
  opened: Object.freeze({ event: 'conversation.opened', aggregation: 'count', denominator: 'all matching events' }),
  resolved: Object.freeze({ event: 'conversation.resolved', aggregation: 'count', denominator: 'all matching events' }),
  firstResponseMs: Object.freeze({ event: 'conversation.first_response', aggregation: 'percentiles', denominator: 'matching response events with durationMs >= 0' }),
  resolutionMs: Object.freeze({ event: 'conversation.resolved', aggregation: 'percentiles', denominator: 'matching resolution events with durationMs >= 0' }),
});

module.exports = { METRIC_CATALOG_VERSION, METRICS };
