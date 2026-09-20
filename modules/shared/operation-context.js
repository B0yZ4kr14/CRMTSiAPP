const { normalizeTenantId } = require('../../tenant-context');

function invalidContext(message) {
  const error = new Error(message);
  error.code = 'OPERATION_CONTEXT_INVALID';
  error.statusCode = 403;
  return error;
}

function createOperationContext(input = {}) {
  const tenantId = normalizeTenantId(input.tenantId);
  const actorId = String(input.actorId || input.actor?.id || '').trim();
  const requestId = String(input.requestId || input.correlationId || '').trim();
  const legacyCapabilities = input.actor?.role === 'admin' ? ['*'] : [];
  const capabilities = [...new Set((input.capabilities || input.authorization?.capabilities || legacyCapabilities)
    .map(value => String(value).trim())
    .filter(Boolean))].sort();

  if (!tenantId) throw invalidContext('tenant context missing or invalid');
  if (!actorId) throw invalidContext('actor identity missing');
  if (!requestId) throw invalidContext('request identity missing');
  if (capabilities.length === 0) throw invalidContext('capabilities missing');

  Object.freeze(capabilities);
  return Object.freeze({ tenantId, actorId, capabilities, requestId });
}

module.exports = { createOperationContext };
