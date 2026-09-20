const { createCsvExport } = require('../modules/reporting/workspace');

async function processExportJob({ report, context, writeArtifact }) {
  if (typeof writeArtifact !== 'function') throw new Error('writeArtifact is required');
  const csv = createCsvExport(report, context);
  const artifact = await writeArtifact(csv, { tenantId: report.tenantId, contentType: 'text/csv; charset=utf-8' });
  return Object.freeze({ status: 'completed', tenantId: report.tenantId, artifact });
}

module.exports = { processExportJob };
