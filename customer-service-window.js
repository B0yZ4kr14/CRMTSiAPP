const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function customerServiceWindow({ provider, lastInboundAt, now = new Date() } = {}) {
  if (provider !== 'meta') return { open: true, expiresAt: null };
  const inboundAt = asDate(lastInboundAt);
  if (!inboundAt) return { open: false, expiresAt: null };
  const expiresAt = new Date(inboundAt.getTime() + CUSTOMER_SERVICE_WINDOW_MS);
  return { open: asDate(now).getTime() < expiresAt.getTime(), expiresAt };
}

function isFreeformMessageAllowed(options) {
  return customerServiceWindow(options).open;
}

module.exports = { CUSTOMER_SERVICE_WINDOW_MS, customerServiceWindow, isFreeformMessageAllowed };
