function escalateIncident({ incidentId, severity, deadline }) {
  if (new Date() > deadline) return { escalated: false, reason: 'deadline expired' };
  return { escalated: true };
}

module.exports = { escalateIncident };
