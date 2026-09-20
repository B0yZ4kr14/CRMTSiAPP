const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeTenantId(value) {
  const tenantId = String(value || '').trim().toLowerCase();
  return UUID.test(tenantId) ? tenantId : null;
}

function resolveTenantContext({ activeTenantId, memberships = [] } = {}) {
  const active = normalizeTenantId(activeTenantId);
  if (!active) return null;
  const allowed = new Set(memberships.map(normalizeTenantId).filter(Boolean));
  return allowed.has(active) ? active : null;
}

module.exports = { normalizeTenantId, resolveTenantContext };
