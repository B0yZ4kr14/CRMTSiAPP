const { resolveAction } = require('./action-registry');

function eventKey(rule, event) {
  return `${rule.tenantId}:${rule.id}:${rule.version}:${event.id}`;
}

function matchesConditions(rule, event) {
  return rule.conditions.every(condition => {
    const field = String(condition.field || '').replace(/^conversation\./, '');
    if (condition.operator !== 'equals') return false;
    return event.data?.[field] === condition.value;
  });
}

async function executeRule({ rule, event, dryRun = false, handlers = {}, executed = new Set() }) {
  if (rule.tenantId !== event.tenantId) return { status: 'rejected', reason: 'tenant mismatch' };
  if (rule.status !== 'draft' && rule.status !== 'active') return { status: 'rejected', reason: 'rule is not executable' };
  if (rule.trigger !== event.type) return { status: 'skipped', reason: 'trigger mismatch' };
  if (!matchesConditions(rule, event)) return { status: 'skipped', reason: 'conditions did not match' };

  const key = eventKey(rule, event);
  const traceBase = { automationId: rule.id, automationVersion: rule.version, eventId: event.id };
  if (!dryRun && executed.has(key)) return { status: 'duplicate', trace: { ...traceBase, actions: [] } };

  const actions = [];
  for (const action of rule.actions) {
    resolveAction(action);
    if (dryRun) {
      actions.push({ type: action.type, outcome: 'would_execute' });
      continue;
    }
    const handler = handlers[action.type];
    if (typeof handler !== 'function') return { status: 'failed', reason: `handler missing for ${action.type}`, trace: { ...traceBase, actions } };
    await handler(action, event);
    actions.push({ type: action.type, outcome: 'executed' });
  }
  if (!dryRun) executed.add(key);
  return { status: dryRun ? 'simulated' : 'completed', trace: { ...traceBase, actions } };
}

module.exports = { executeRule };
