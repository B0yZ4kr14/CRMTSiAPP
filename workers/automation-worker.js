const { executeRule } = require('../modules/automation/engine');

async function processAutomationEvent({ rule, event, handlers, executed }) {
  return executeRule({ rule, event, handlers, executed });
}

module.exports = { processAutomationEvent };
