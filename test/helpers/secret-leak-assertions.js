function flattenOutputs(outputs, prefix = 'output') {
  const flattened = [];
  const visit = (value, label) => {
    if (value === null || value === undefined) return;
    if (Buffer.isBuffer(value)) flattened.push({ label, text: value.toString('utf8') });
    else if (typeof value === 'string') flattened.push({ label, text: value });
    else if (Array.isArray(value)) value.forEach((entry, index) => visit(entry, `${label}[${index}]`));
    else if (typeof value === 'object') Object.entries(value).forEach(([key, entry]) => visit(entry, `${label}.${key}`));
    else flattened.push({ label, text: String(value) });
  };
  visit(outputs, prefix);
  return flattened;
}

function assertNoSecretLeaks(canary, outputs) {
  if (typeof canary !== 'string' || canary.length < 8) throw new Error('secret canary must contain at least 8 characters');
  const leaks = flattenOutputs(outputs).filter(entry => entry.text.includes(canary));
  if (leaks.length) {
    const error = new Error(`secret canary leaked through: ${leaks.map(leak => leak.label).join(', ')}`);
    error.code = 'SECRET_LEAK_DETECTED';
    error.locations = leaks.map(leak => leak.label);
    throw error;
  }
}

module.exports = { assertNoSecretLeaks, flattenOutputs };
