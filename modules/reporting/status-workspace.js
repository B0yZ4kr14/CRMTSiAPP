function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function renderStatusWorkspace({ status, alerts = [], csrfToken = '' }) {
  const degraded = status.ready.degraded.length ? status.ready.degraded.join(', ') : 'nenhum';
  const alertRows = alerts.length
    ? alerts.map(alert => `<li><strong>${esc(alert.rule_id)}</strong> · ${esc(alert.status)} · ${esc(alert.severity)}<form method="post" action="/status/alerts/${encodeURIComponent(alert.id)}/acknowledge"><input type="hidden" name="csrf_token" value="${esc(csrfToken)}"><button type="submit">Reconhecer</button></form></li>`).join('')
    : '<li>Nenhum alerta aberto.</li>';
  return `<section class="status-workspace" aria-label="Status operacional"><h1>Status operacional</h1><p>Readiness: <strong>${status.ready.ok ? 'pronto' : 'degradado'}</strong></p><p>Componentes degradados: ${esc(degraded)}</p><p>Fila: retries ${esc(status.backlog.retryCount)} · DLQ ${esc(status.backlog.deadLetterCount)}</p><h2>Alertas</h2><ul>${alertRows}</ul></section>`;
}

module.exports = { renderStatusWorkspace };
