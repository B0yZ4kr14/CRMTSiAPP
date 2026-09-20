function refreshSegment({ segmentId, tenantId }) {
  return { segmentId, tenantId, status: 'refreshed', updatedAt: new Date() };
}

module.exports = { refreshSegment };
