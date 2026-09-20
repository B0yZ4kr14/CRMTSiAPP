function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function createReportWorkspace({ report, filters = {} }) {
  const channel = filters.dimensions?.channel || 'Todos';
  return `<section class="report-workspace" aria-label="Relatórios operacionais">
    <h1>Relatórios operacionais</h1>
    <p>Tenant ${esc(report.tenantId)} · Fuso ${esc(report.timezone)} · Canal ${esc(channel)}</p>
    <dl><dt>Conversas abertas</dt><dd>${esc(report.counts.opened)}</dd><dt>Conversas resolvidas</dt><dd>${esc(report.counts.resolved)}</dd><dt>Resposta p95</dt><dd>${esc(report.firstResponseMs.p95 ?? '—')} ms</dd></dl>
    <a href="/reports/export.csv" download>Exportar CSV</a>
  </section>`;
}

function createCsvExport(report, context = {}) {
  if (String(context.tenantId || '') !== report.tenantId) throw new Error('report tenant does not match export context');
  const rows = [
    ['metric', 'value', 'denominator'],
    ['opened', report.counts.opened, 'all matching events'],
    ['resolved', report.counts.resolved, 'all matching events'],
    ['first_response_p50_ms', report.firstResponseMs.p50 ?? '', 'matching response events with durationMs >= 0'],
    ['first_response_p90_ms', report.firstResponseMs.p90 ?? '', 'matching response events with durationMs >= 0'],
    ['first_response_p95_ms', report.firstResponseMs.p95 ?? '', 'matching response events with durationMs >= 0'],
  ];
  return `${rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')}\n`;
}

module.exports = { createReportWorkspace, createCsvExport };
