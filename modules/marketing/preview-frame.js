const { createPreview } = require('./preview-service');

function createPreviewFrame({ content, channel, variables = {} }) {
  const preview = createPreview({ content, channel, variables });
  const csp = "default-src 'none'; img-src https: http:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Campaign preview</title></head><body>${preview.html}</body></html>`;
  return { html, sandbox: 'allow-scripts', csp, channel: preview.channel, capabilityProfileVersion: preview.capabilityProfileVersion };
}

module.exports = { createPreviewFrame };