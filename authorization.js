const { can, ROLE_CAPABILITIES } = require('./rbac');

function effectiveRole({ legacyRole, assignedRoles = [] } = {}) {
  if (assignedRoles.length > 0) {
    const normalized = [...new Set(assignedRoles)];
    if (normalized.length !== 1 || !Object.hasOwn(ROLE_CAPABILITIES, normalized[0])) return null;
    return normalized[0];
  }
  return Object.hasOwn(ROLE_CAPABILITIES, legacyRole) ? legacyRole : null;
}

function ensureAuthorized(user, capability) {
  if (!user?.id || !can(user.role, capability)) {
    const error = new Error('forbidden');
    error.statusCode = 403;
    throw error;
  }
}

function auditInsert(pool, { tenantId, actorUserId = null, action, resourceType, resourceId = null, metadata = {} }) {
  if (!tenantId) throw new TypeError('tenantId is required for audit');
  return pool.query(
    'insert into audit_events(id,tenant_id,actor_user_id,action,resource_type,resource_id,metadata) values($1,$2,$3,$4,$5,$6,$7)',
    [require('crypto').randomUUID(), tenantId, actorUserId, action, resourceType, resourceId, JSON.stringify(metadata)],
  );
}

module.exports = { auditInsert, effectiveRole, ensureAuthorized };
