const test = require('node:test');
const assert = require('node:assert/strict');
const { createLoginRateLimiter } = require('../security');

test('login limiter blocks an address after the configured number of failures', () => {
  const limiter = createLoginRateLimiter({ limit: 2, windowMs: 60_000, now: () => 1_000 });
  assert.equal(limiter.isBlocked('198.51.100.10'), false);
  limiter.recordFailure('198.51.100.10');
  assert.equal(limiter.isBlocked('198.51.100.10'), false);
  limiter.recordFailure('198.51.100.10');
  assert.equal(limiter.isBlocked('198.51.100.10'), true);
});

test('login limiter resets failures after a successful login', () => {
  const limiter = createLoginRateLimiter({ limit: 2, windowMs: 60_000, now: () => 1_000 });
  limiter.recordFailure('198.51.100.10');
  limiter.reset('198.51.100.10');
  assert.equal(limiter.isBlocked('198.51.100.10'), false);
});

test('login limiter expires a stale failure window', () => {
  let now = 1_000;
  const limiter = createLoginRateLimiter({ limit: 1, windowMs: 60_000, now: () => now });
  limiter.recordFailure('198.51.100.10');
  now += 60_001;
  assert.equal(limiter.isBlocked('198.51.100.10'), false);
});
