const { redact } = require('./redaction');

async function recordAuditEvent(pool, { operationContext, action, resourceType, resourceId, metadata = {} }) {
  if (!operationContext?.tenantId || !operationContext?.actorId) {
    throw new Error('operation context with tenantId and actorId required');
  }
  const result = await pool.query(
    `insert into audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata)
     values (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
     returning id`,
    [
      operationContext.tenantId,
      operationContext.actorId,
      action,
      resourceType,
      resourceId,
      JSON.stringify({ ...redact(metadata), requestId: operationContext.requestId })
    ]
  );
  return result.rows[0].id;
}

module.exports = { recordAuditEvent };
