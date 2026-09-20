const crypto = require('node:crypto');

function privacyError(code) { const error = new Error(code); error.code = code; return error; }
function assertRequest(request) {
  if (!request || !request.tenantId || !request.actorId || !['export', 'anonymize', 'delete'].includes(request.kind) || !request.target) throw privacyError('VALIDATION_ERROR');
}

async function createPrivacyRequest(pool, request) {
  assertRequest(request);
  const id = request.id || crypto.randomUUID();
  const result = await pool.query(`insert into privacy_requests(id,tenant_id,contact_phone,kind,requested_by,status,created_at)
    values($1,$2,$3,$4,$5,'open',now()) returning id,status,kind,contact_phone`, [id, request.tenantId, request.target, request.kind, request.actorId]);
  return result.rows[0];
}

async function processPrivacyRequest(pool, { tenantId, requestId, actorId }) {
  if (!tenantId || !requestId || !actorId) throw privacyError('OPERATION_CONTEXT_REQUIRED');
  const client = await pool.connect();
  try {
    await client.query('begin');
    const found = await client.query('select * from privacy_requests where id=$1 and tenant_id=$2 for update', [requestId, tenantId]);
    if (!found.rowCount) throw privacyError('NOT_FOUND');
    const request = found.rows[0];
    if (request.legal_hold) {
      await client.query("update privacy_requests set status='rejected',result=$3,completed_at=now() where id=$1 and tenant_id=$2", [requestId, tenantId, JSON.stringify({ retained: true, reason: 'legal_hold' })]);
      await client.query('commit');
      return { id: requestId, status: 'rejected', result: { retained: true, reason: 'legal_hold' } };
    }
    if (request.status === 'completed') { await client.query('commit'); return { id: request.id, status: request.status, replayed: true }; }
    await client.query("update privacy_requests set status='processing' where id=$1 and tenant_id=$2", [requestId, tenantId]);
    let result = {};
    if (request.kind === 'export') {
      const conversations = await client.query(`select c.id,c.status,c.channel,c.created_at from conversations c where c.tenant_id=$1 and c.contact_phone=$2 order by c.created_at`, [tenantId, request.contact_phone]);
      result = { conversations: conversations.rows };
    } else if (request.kind === 'anonymize') {
      await client.query(`update conversations set contact_name='[redacted]', contact_phone=null where tenant_id=$1 and contact_phone=$2`, [tenantId, request.contact_phone]);
      result = { anonymized: true };
    } else {
      await client.query('delete from conversations where tenant_id=$1 and contact_phone=$2', [tenantId, request.contact_phone]);
      result = { deleted: true };
    }
    await client.query("update privacy_requests set status='completed',result=$2,completed_at=now() where id=$1 and tenant_id=$3", [requestId, JSON.stringify(result), tenantId]);
    await client.query('commit');
    return { id: requestId, status: 'completed', result, actorId };
  } catch (error) { try { await client.query('rollback'); } catch {} throw error; } finally { client.release(); }
}

async function runRetention(pool, { tenantId, before, actorId }) {
  if (!tenantId || !before || !actorId) throw privacyError('OPERATION_CONTEXT_REQUIRED');
  const result = await pool.query(`delete from conversations where tenant_id=$1 and created_at < $2 returning id`, [tenantId, before]);
  return { tenantId, deletedCount: result.rowCount, before: new Date(before).toISOString(), actorId };
}

function validatePrivacyRequest(request) { return Boolean(request && ['export', 'anonymize', 'delete'].includes(request.kind) && request.contactPhone); }
module.exports = { validatePrivacyRequest, createPrivacyRequest, processPrivacyRequest, runRetention };
