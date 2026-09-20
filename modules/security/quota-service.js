function checkQuota({ currentUsage, limit }) {
  return currentUsage < limit;
}

module.exports = { checkQuota };
