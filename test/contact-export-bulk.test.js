const test = require('node:test');
const assert = require('node:assert/strict');
const { generateExport } = require('../modules/crm/export-service');

test('export service generates privileged export', () => {
  const exportData = generateExport({ tenantId: 't1', user: { role: 'admin' } });
  assert.equal(exportData.status, 'queued');
});
