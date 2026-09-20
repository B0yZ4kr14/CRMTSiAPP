const crypto = require('node:crypto');

function createArtifactMetadata({ ownerId, tenantId, expiresAt }) {
  return {
    id: crypto.randomUUID(),
    ownerId,
    tenantId,
    expiresAt,
    createdAt: new Date()
  };
}

module.exports = { createArtifactMetadata };
