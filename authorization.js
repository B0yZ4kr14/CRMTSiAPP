const { can, ROLE_CAPABILITIES } = require('./rbac');

function effectiveRole({ legacyRole, assignedRoles = [] } = {}) {
  if (assignedRoles.length > 0) {
    const assigned = assignedRoles.find(role => Object.hasOwn(ROLE_CAPABILITIES, role));
    return assigned || null;
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

function auditInsert(pool, { actorUserId = null, action, resourceType, resourceId = null, metadata = {} }) {
  return pool.query(
    'insert into audit_events(id,actor_user_id,action,resource_type,resource_id,metadata) values($1,$2,$3,$4,$5,$6)',
    [require('crypto').randomUUID(), actorUserId, action, resourceType, resourceId, JSON.stringify(metadata)],
  );
}

module.exports = { auditInsert, effectiveRole, ensureAuthorized };
