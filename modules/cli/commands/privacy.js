async function createPrivacyRequest({ pool, tenantId, actorId, args }) {
  const kind = String(args.kind || args.type || '').trim();
  const target = String(args.target || '').trim();
  if (!['export', 'anonymize', 'delete'].includes(kind) || !target) {
    const error = new Error('VALIDATION_ERROR');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }
  const result = await pool.query(
    `insert into privacy_requests(id,tenant_id,contact_phone,kind,requested_by,status,created_at)
     values(gen_random_uuid(),$1,$2,$3,$4,'open',now()) returning id,status`,
    [tenantId, target, kind, actorId],
  );
  return { id: result.rows[0].id, status: result.rows[0].status, kind };
}

module.exports = { createPrivacyRequest };