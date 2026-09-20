const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateString(value, { required = false, maxLen = 1000 } = {}) {
  const str = String(value || '').trim();
  if (required && !str) {
    throw new Error('field is required');
  }
  if (str.length > maxLen) {
    throw new Error('field exceeds maximum length');
  }
  return str;
}

function validateUuid(value) {
  const str = String(value || '').trim();
  if (!UUID.test(str)) {
    throw new Error('invalid uuid');
  }
  return str;
}

module.exports = { validateString, validateUuid };
