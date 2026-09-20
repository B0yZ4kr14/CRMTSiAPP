const { normalizeCampaignContent } = require('./content-schema');
const { getCapabilityProfile } = require('./channel-capabilities');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function substituteVariables(value, variables = {}) {
  return String(value || '').replace(/\{\{([a-z]+\.[a-z]+)\}\}/g, (_, key) => String(variables[key] ?? ''));
}

function safeUrl(value, variables) {
  const resolved = substituteVariables(value, variables);
  let url;
  try { url = new URL(resolved); } catch {
    const error = new Error('CONTENT_URL_UNSAFE');
    error.code = 'CONTENT_URL_UNSAFE';
    throw error;
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    const error = new Error('CONTENT_URL_UNSAFE');
    error.code = 'CONTENT_URL_UNSAFE';
    throw error;
  }
  return url.toString();
}

function compileCampaignContent(content, { channel, variables = {} } = {}) {
  const normalized = normalizeCampaignContent(content);
  const profile = getCapabilityProfile(channel);
  const fragments = [];
  const text = [];

  for (const block of normalized.blocks) {
    const body = substituteVariables(block.text, variables);
    text.push(body);
    if (block.type === 'paragraph') fragments.push(`<p>${escapeHtml(body)}</p>`);
    else if (block.type === 'heading') fragments.push(`<h2>${escapeHtml(body)}</h2>`);
    else if (block.type === 'divider') fragments.push('<hr>');
    else if (block.type === 'button') {
      if (!profile.features.buttons) continue;
      try {
        fragments.push(`<a href="${escapeHtml(safeUrl(block.url, variables))}" rel="noopener noreferrer">${escapeHtml(body)}</a>`);
      } catch { text.push('[unsafe URL removed]'); }
    } else if (block.type === 'image') {
      if (!profile.features.images) continue;
      try {
        fragments.push(`<img src="${escapeHtml(safeUrl(block.url, variables))}" alt="${escapeHtml(body)}">`);
      } catch { text.push('[unsafe URL removed]'); }
    }
  }

  return { channel: profile.channel, capabilityProfileVersion: profile.version, html: fragments.join(''), text: text.join('\n') };
}

module.exports = { escapeHtml, substituteVariables, safeUrl, compileCampaignContent };