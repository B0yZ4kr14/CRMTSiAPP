const { conflict } = require('./operational-errors');

function parseVersion(value) {
  const normalized = String(value ?? '').trim().replace(/^W\//, '').replace(/^"|"$/g, '');
  if (!/^\d+$/.test(normalized)) return null;
  const version = Number(normalized);
  return Number.isSafeInteger(version) ? version : null;
}

function requireMatchingVersion(expected, presented) {
  const expectedVersion = parseVersion(expected);
  const presentedVersion = parseVersion(presented);
  if (expectedVersion === null || presentedVersion === null || expectedVersion !== presentedVersion) {
    throw conflict('VERSION_CONFLICT', 'resource version changed', {
      details: { expectedVersion, presentedVersion },
    });
  }
  return expectedVersion;
}

function versionEtag(version) {
  const parsed = parseVersion(version);
  if (parsed === null) throw new TypeError('version must be a non-negative safe integer');
  return `"${parsed}"`;
}

module.exports = { parseVersion, requireMatchingVersion, versionEtag };
