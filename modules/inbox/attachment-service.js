const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf', 'text/plain', 'audio/ogg']);

function validateAttachment({ size, mimetype }) {
  if (!size || size > MAX_SIZE) return false;
  if (!mimetype || !ALLOWED_TYPES.has(mimetype)) return false;
  return true;
}

module.exports = { validateAttachment };
