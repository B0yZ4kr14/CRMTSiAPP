function generateExport({ tenantId, user }) {
  if (user.role !== 'admin') throw new Error('forbidden');
  return { id: 'exp-1', tenantId, status: 'queued' };
}

module.exports = { generateExport };
