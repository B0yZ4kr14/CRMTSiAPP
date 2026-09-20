function hasCapability(context, capability) {
  return Boolean(context?.capabilities?.includes('*') || context?.capabilities?.includes(capability));
}

function evaluatePolicy(context, capability, resource) {
  if (!context?.tenantId || !context?.actorId || !hasCapability(context, capability)) return false;
  if (resource?.tenantId && context.tenantId !== resource.tenantId) return false;
  return true;
}

async function canScope(context, capability, resource) {
  return evaluatePolicy(context, capability, resource);
}

function requireScope(context, capability, resource) {
  if (!evaluatePolicy(context, capability, resource)) {
    const error = new Error('forbidden');
    error.code = 'FORBIDDEN';
    error.statusCode = 403;
    throw error;
  }
  return true;
}

module.exports = { canScope, evaluatePolicy, hasCapability, requireScope };
