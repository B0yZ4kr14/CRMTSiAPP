function normalizeLogin(login) {
  const value = String(login || '').trim().toLowerCase();
  return value === 'admin' ? 'admin@tsiapp.io' : value;
}
module.exports = { normalizeLogin };
