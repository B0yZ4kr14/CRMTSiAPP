function getRecoveryStats({ tenantId }) {
  // Mock statistics
  return { dlqCount: 0, retryableCount: 0, tenantId };
}

module.exports = { getRecoveryStats };
