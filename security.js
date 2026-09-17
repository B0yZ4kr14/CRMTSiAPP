const crypto = require('crypto');

function parseCookies(req) {
  const cookies = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(part.slice(index + 1));
    } catch {
      // A malformed cookie must not turn a request into a server error.
    }
  }
  return cookies;
}

function isSameOrigin(req, appUrl) {
  const origin = req.headers.origin;
  if (origin) return origin === appUrl;
  const referer = req.headers.referer;
  if (!referer) return true;
  try {
    return new URL(referer).origin === appUrl;
  } catch {
    return false;
  }
}

function createLoginRateLimiter({ limit = 10, windowMs = 15 * 60_000, now = Date.now } = {}) {
  const attempts = new Map();
  function entry(address) {
    const current = attempts.get(address);
    if (!current || now() - current.startedAt >= windowMs) {
      const fresh = { count: 0, startedAt: now() };
      attempts.set(address, fresh);
      return fresh;
    }
    return current;
  }
  return {
    isBlocked(address) { return entry(address).count >= limit; },
    recordFailure(address) { const current = entry(address); current.count += 1; },
    reset(address) { attempts.delete(address); },
  };
}

function normalizeForwardedAddress(req, trustedProxyAddresses = []) {
  const peer = req.socket?.remoteAddress || 'unknown';
  if (!trustedProxyAddresses.includes(peer)) return peer;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded !== 'string' || !forwarded.trim()) return peer;
  return forwarded.split(',', 1)[0].trim() || peer;
}

function createCsrfToken(sessionId, secret = process.env.CSRF_SECRET || 'development-only-csrf-secret') {
  const nonce = crypto.randomBytes(24).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${sessionId}.${nonce}`).digest('base64url');
  return `${nonce}.${signature}`;
}

function verifyCsrfToken(token, sessionId, secret = process.env.CSRF_SECRET || 'development-only-csrf-secret') {
  if (typeof token !== 'string' || typeof sessionId !== 'string') return false;
  const [nonce, signature, extra] = token.split('.');
  if (!nonce || !signature || extra) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${sessionId}.${nonce}`).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function isInternalPath(pathname) {
  return pathname === '/.env'
    || pathname === '/server.js'
    || pathname === '/migrate.js'
    || pathname === '/security.js'
    || pathname === '/package.json'
    || pathname.startsWith('/.git/')
    || pathname === '/.git'
    || pathname.startsWith('/node_modules/');
}

module.exports = { createCsrfToken, createLoginRateLimiter, isInternalPath, isSameOrigin, normalizeForwardedAddress, parseCookies, verifyCsrfToken };
