const crypto = require('node:crypto');

const TRIGGERS = new Set(['conversation.opened', 'message.received', 'sla.breached', 'schedule.elapsed']);
const ACTIONS = new Set(['assign_queue', 'assign_user', 'add_tag', 'send_template', 'create_task', 'handoff']);
const TRANSITIONS = Object.freeze({
  draft: new Set(['active', 'archived']),
  active: new Set(['paused', 'archived']),
  paused: new Set(['active', 'archived']),
  archived: new Set(),
});

function validateAction(action) {
  if (!action || typeof action !== 'object' || !ACTIONS.has(action.type)) throw new Error('unsupported action');
}

function createAutomationRule({ tenantId, name, trigger, conditions = [], actions = [], version = 1, status = 'draft' } = {}) {
  if (!tenantId) throw new Error('tenant is required');
  if (!name || !String(name).trim()) throw new Error('name is required');
  if (!TRIGGERS.has(trigger)) throw new Error('unsupported trigger');
  if (!Array.isArray(conditions) || !Array.isArray(actions)) throw new Error('conditions and actions must be arrays');
  actions.forEach(validateAction);
  if (!Number.isInteger(version) || version < 1) throw new Error('version must be a positive integer');
  if (!TRANSITIONS[status]) throw new Error('invalid automation status');
  return Object.freeze({ id: crypto.randomUUID(), tenantId, name: String(name).trim(), trigger, conditions: structuredClone(conditions), actions: structuredClone(actions), version, status });
}

function transitionAutomationRule(rule, target) {
  if (!rule || !TRANSITIONS[rule.status]?.has(target)) throw new Error('invalid automation transition');
  return Object.freeze({ ...rule, status: target });
}

module.exports = { ACTIONS, TRIGGERS, createAutomationRule, transitionAutomationRule };
