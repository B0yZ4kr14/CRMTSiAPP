const { ACTIONS } = require('./rule-service');

function resolveAction(action) {
  if (!action || !ACTIONS.has(action.type)) throw new Error('unsupported action');
  return Object.freeze({ type: action.type, payload: structuredClone(action) });
}

module.exports = { resolveAction };
