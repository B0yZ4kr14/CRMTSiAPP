function getInboxView({ tenantId, filter = 'all' }) {
  return {
    tenantId,
    filter,
    url: `/inbox?filter=${filter}`
  };
}

module.exports = { getInboxView };
