const crypto = require('node:crypto');
const { TENANT_A, TENANT_B } = require('../fixtures/tenant-matrix');

function sessionId() {
  return `oe-${crypto.randomUUID()}`;
}

function createOperationalPrincipals() {
  const tenantA = { id: TENANT_A, slug: 'tenant-a' };
  const tenantB = { id: TENANT_B, slug: 'tenant-b' };
  return {
    tenantA,
    tenantB,
    adminA: {
      id: 'oe-admin-a',
      role: 'admin',
      activeTenantId: tenantA.id,
      sessionId: sessionId(),
    },
    adminB: {
      id: 'oe-admin-b',
      role: 'admin',
      activeTenantId: tenantB.id,
      sessionId: sessionId(),
    },
    operatorA: {
      id: 'oe-operator-a',
      role: 'operator',
      activeTenantId: tenantA.id,
      sessionId: sessionId(),
    },
    denied: {
      id: 'oe-denied',
      role: 'none',
      activeTenantId: null,
      sessionId: sessionId(),
    },
  };
}

function sessionCookie(principal) {
  if (!principal?.sessionId || !principal.activeTenantId) throw new Error('tenant-scoped principal is required');
  return `crmtsiapp_session=${encodeURIComponent(principal.sessionId)}`;
}

module.exports = { createOperationalPrincipals, sessionCookie };
