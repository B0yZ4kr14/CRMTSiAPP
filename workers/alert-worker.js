const { createAlertService } = require('../modules/reporting/alert-service');

async function evaluateAlertBatch({ alerts = createAlertService(), signals = [], now = new Date() }) {
  const results = signals.map(signal => alerts.evaluate(signal));
  const escalated = alerts.escalateDue(now);
  return Object.freeze({ results, escalated });
}

module.exports = { evaluateAlertBatch };
