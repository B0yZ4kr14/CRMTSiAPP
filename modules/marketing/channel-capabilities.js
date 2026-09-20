const PROFILES = Object.freeze({
  waha: Object.freeze({
    channel: 'waha',
    version: 1,
    features: Object.freeze({ buttons: true, images: true, templates: false, markdown: true }),
    limits: Object.freeze({ textLength: 4000, buttons: 3 }),
  }),
  meta: Object.freeze({
    channel: 'meta',
    version: 1,
    features: Object.freeze({ buttons: true, images: true, templates: true, markdown: false }),
    limits: Object.freeze({ textLength: 1024, buttons: 3 }),
  }),
});

function getCapabilityProfile(channel) {
  const profile = PROFILES[String(channel || '').toLowerCase()];
  if (!profile) {
    const error = new Error('CHANNEL_NOT_SUPPORTED');
    error.code = 'CHANNEL_NOT_SUPPORTED';
    throw error;
  }
  return structuredClone(profile);
}

module.exports = { PROFILES, getCapabilityProfile };