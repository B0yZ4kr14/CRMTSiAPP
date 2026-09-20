const crypto = require('crypto');
const dns = require('node:dns').promises;
const net = require('node:net');
const { Agent } = require('undici');

function safeEqual(left, right) {
  const a = Buffer.from(left || '');
  const b = Buffer.from(right || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyMetaSignature({ rawBody, signature, appSecret }) {
  if (!Buffer.isBuffer(rawBody) || !appSecret || typeof signature !== 'string' || !signature.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  return safeEqual(signature, expected);
}

class FakeAdapter {
  constructor() { this.sessions = new Map(); }
  sessionKey(channel) { return `${channel.provider}:${channel.id}`; }
  async health(channel) { return { state: this.sessions.get(this.sessionKey(channel))?.state || 'disconnected' }; }
  async startSession(channel) { const session = { state: 'starting', qr: `fake-qr:${channel.id}` }; this.sessions.set(this.sessionKey(channel), session); return { state: session.state }; }
  async getQr(channel) { const session = this.sessions.get(this.sessionKey(channel)); return session?.qr ? { qr: session.qr, expiresAt: null } : { qr: null, expiresAt: null }; }
  async sendText({ clientMessageId }) { return { providerMessageId: `fake:${clientMessageId}`, status: 'sent' }; }
  async sendTemplate({ clientMessageId }) { return { providerMessageId: `fake:${clientMessageId}`, status: 'sent' }; }
  async sendMedia({ clientMessageId }) { return { providerMessageId: `fake:${clientMessageId}`, status: 'sent' }; }
  verifyWebhook() { return true; }
  parseWebhook({ rawBody }) { return JSON.parse(Buffer.from(rawBody).toString('utf8')); }
  normalizeDelivery(event) { return event; }
}

function requestOptions(options = {}, timeoutMs = 15000) {
  return { redirect: 'manual', ...options, signal: options.signal || AbortSignal.timeout(timeoutMs) };
}

function providerMessageId(value) {
  const id = String(value || '').trim();
  if (!id || id === 'undefined' || id.length > 512) throw new Error('provider message id is missing');
  return id;
}

function isPublicAddress(address) {
  if (net.isIP(address) === 4) {
    const [a,b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224);
  }
  if (net.isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return !(normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || /^fe[89ab]/.test(normalized) || normalized.startsWith('ff'));
  }
  return false;
}

async function safeWahaDispatcher(baseUrl, lookup = dns.lookup) {
  const target = new URL(baseUrl);
  const answers = await lookup(target.hostname, { all: true, verbatim: true });
  if (!answers.length || answers.some(answer => !isPublicAddress(answer.address))) throw new Error('WAHA endpoint resolves to a non-public address');
  const pinned = answers[0];
  return new Agent({ connect: { lookup(hostname, options, callback) {
    if (hostname !== target.hostname) return callback(new Error('WAHA redirect hostname is not allowed'));
    callback(null, pinned.address, pinned.family);
  } } });
}

class WahaAdapter {
  constructor({ fetchFn = fetch, lookup = dns.lookup, dispatcherFactory = safeWahaDispatcher } = {}) { this.fetchFn = fetchFn; this.lookup = lookup; this.dispatcherFactory = dispatcherFactory; }
  config(channel) { return channel?.config || {}; }
  async request(baseUrl, url, options) {
    const dispatcher = await this.dispatcherFactory(baseUrl, this.lookup);
    try { return await this.fetchFn(url, { ...requestOptions(options), dispatcher }); }
    finally { await dispatcher.close?.(); }
  }
  async health(channel) {
    const { baseUrl, sessionName, apiKey } = this.config(channel);
    if (!baseUrl || !sessionName || !apiKey) return { state: 'unconfigured' };
    const response = await this.request(baseUrl, new URL(`/api/sessions/${encodeURIComponent(sessionName)}`, baseUrl), { headers: { 'X-Api-Key': apiKey, accept: 'application/json' } });
    if (!response.ok) throw new Error(`WAHA health HTTP ${response.status}`);
    const body = await response.json();
    return { state: String(body.status || body.state || 'unknown').toLowerCase(), raw: body };
  }
  async startSession(channel) {
    const { baseUrl, sessionName, apiKey } = this.config(channel);
    const response = await this.request(baseUrl, new URL(`/api/sessions/${encodeURIComponent(sessionName)}/start`, baseUrl), { method: 'POST', headers: { 'X-Api-Key': apiKey } });
    if (!response.ok) throw new Error(`WAHA start HTTP ${response.status}`);
    const body = await response.json().catch(() => ({}));
    return { state: String(body.status || body.state || 'starting').toLowerCase() };
  }
  async getQr(channel) {
    const { baseUrl, sessionName, apiKey } = this.config(channel);
    const url = new URL(`/api/${encodeURIComponent(sessionName)}/auth/qr?format=base64`, baseUrl);
    const response = await this.request(baseUrl, url, { headers: { 'X-Api-Key': apiKey } });
    if (!response.ok) throw new Error(`WAHA QR HTTP ${response.status}`);
    return { qr: await response.text(), expiresAt: null };
  }
  async sendText({ channel, to, body }) {
    const { baseUrl, sessionName, apiKey } = this.config(channel);
    const response = await this.request(baseUrl, new URL('/api/sendText', baseUrl), { method: 'POST', headers: { 'content-type': 'application/json', 'X-Api-Key': apiKey }, body: JSON.stringify({ session: sessionName, chatId: to.includes('@') ? to : `${to}@c.us`, text: body }) });
    if (!response.ok) throw new Error(`WAHA send HTTP ${response.status}`);
    const payload = await response.json();
    return { providerMessageId: providerMessageId(payload.id || payload.key?.id || payload.messageId), status: 'sent' };
  }
  verifyWebhook({ headers, channel }) {
    const { webhookToken } = this.config(channel);
    if (!webhookToken) return false;
    return safeEqual(headers?.['x-webhook-token'] || headers?.['x-waha-token'], webhookToken);
  }
  parseWebhook({ body }) { return body; }
  normalizeWebhook(payload) {
    const data = payload?.payload || payload?.data || payload || {};
    const messageId = data?.id || data?.key?.id || data?.message?.id;
    return { type: String(payload?.event || payload?.eventType || payload?.type || 'unknown'), providerEventId: messageId || payload?.id, payload };
  }
}

function serializeTemplatePayload({ name, language, variables = [] } = {}) {
  const templateName = String(name || '').trim();
  const languageCode = String(language || '').trim();
  if (!/^[a-zA-Z0-9_]{1,128}$/.test(templateName)) throw new Error('template name is invalid');
  if (!/^[a-z]{2,3}([_-][A-Za-z]{2,4})?$/.test(languageCode)) throw new Error('template language is invalid');
  if (!Array.isArray(variables) || variables.length > 100 || variables.some(value => typeof value !== 'string' || value.length > 1024)) throw new Error('template variables are invalid');
  return { type:'template', template:{ name:templateName, language:{code:languageCode}, components:variables.length ? [{type:'body',parameters:variables.map(text=>({type:'text',text}))}] : [] } };
}

class MetaAdapter {
  constructor({ fetchFn = fetch } = {}) { this.fetchFn = fetchFn; }
  config(channel) { return channel?.config || {}; }
  async sendText({ channel, to, body }) {
    const { graphVersion, phoneNumberId, accessToken } = this.config(channel);
    if (!graphVersion || !phoneNumberId || !accessToken) throw new Error('Meta channel is unconfigured');
    const url = `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`;
    const response = await this.fetchFn(url, requestOptions({ method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }) }));
    if (!response.ok) throw new Error(`Meta send HTTP ${response.status}`);
    const payload = await response.json();
    return { providerMessageId: providerMessageId(payload.messages?.[0]?.id), status: 'sent' };
  }
  async sendTemplate({ channel, to, name, language, variables }) {
    const { graphVersion, phoneNumberId, accessToken } = this.config(channel);
    if (!graphVersion || !phoneNumberId || !accessToken) throw new Error('Meta channel is unconfigured');
    const url = `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`;
    const response = await this.fetchFn(url, requestOptions({ method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ messaging_product:'whatsapp', to, ...serializeTemplatePayload({ name, language, variables }) }) }));
    if (!response.ok) { const error = new Error(`Meta template HTTP ${response.status}`); error.status = response.status; throw error; }
    const payload = await response.json();
    return { providerMessageId: providerMessageId(payload.messages?.[0]?.id), status: 'sent' };
  }
}

module.exports = { FakeAdapter, MetaAdapter, WahaAdapter, isPublicAddress, safeEqual, safeWahaDispatcher, serializeTemplatePayload, verifyMetaSignature };