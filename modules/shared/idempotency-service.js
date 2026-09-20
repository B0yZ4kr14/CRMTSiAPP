const crypto = require('node:crypto');
const { conflict } = require('./operational-errors');

function requestFingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
}

async function claimIdempotency(client, { tenantId, key, operation, request }) {
  if (!tenantId || !key || !operation) throw new TypeError('tenantId, key and operation are required');
  const fingerprint = requestFingerprint(request);
  const inserted = await client.query(
    `insert into operational_idempotency_keys(tenant_id,idempotency_key,operation,request_hash,status)
     values($1,$2,$3,$4,'processing') on conflict do nothing returning id`,
    [tenantId, key, operation, fingerprint],
  );
  if (inserted.rowCount === 1) return { claimed: true, fingerprint, record: inserted.rows[0] };
  const existing = await client.query(
    `select request_hash,status,response_status,response_body from operational_idempotency_keys
     where tenant_id=$1 and idempotency_key=$2 and operation=$3`,
    [tenantId, key, operation],
  );
  const record = existing.rows[0];
  if (!record || record.request_hash !== fingerprint) {
    throw conflict('IDEMPOTENCY_CONFLICT', 'idempotency key reused with different input');
  }
  return { claimed: false, fingerprint, record };
}

async function resolveIdempotency(client, { tenantId, key, operation, responseStatus, responseBody }) {
  return client.query(
    `update operational_idempotency_keys set status='completed',response_status=$4,response_body=$5,completed_at=now()
     where tenant_id=$1 and idempotency_key=$2 and operation=$3 and status='processing'`,
    [tenantId, key, operation, responseStatus, JSON.stringify(responseBody ?? null)],
  );
}

module.exports = { claimIdempotency, requestFingerprint, resolveIdempotency };
