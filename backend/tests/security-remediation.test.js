const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Set safe dummy env vars before loading backend modules
process.env.JWT_SECRET = 'test_secret_at_least_thirty_two_characters_long_12345';
process.env.APP_URL = 'https://betweenletters.example';
process.env.NODE_ENV = 'test';

const {
  getAllowedOrigins,
  csrfProtection,
  verifyCodeLimiter,
  validateRegistrationInput,
  securityHeaders
} = require('../src/middlewares/security');

const { resolvePublicAppUrl } = require('../src/utils/entitlement');

function createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    headers,
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    removeHeader(k) { delete headers[k.toLowerCase()]; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

test('SEC-02: getAllowedOrigins includes configured APP_URL and rejects untrusted origins', () => {
  const allowed = getAllowedOrigins();
  assert.equal(allowed.has('https://betweenletters.example'), true);
  assert.equal(allowed.has('https://evil.example'), false);
});

test('SEC-02: csrfProtection rejects cookie-authenticated POST with missing Origin and Referer', () => {
  const req = {
    method: 'POST',
    originalUrl: '/api/journal/notebooks/test-nb',
    cookies: { access_token: 'dummy' },
    headers: { host: 'betweenletters.example' },
    app: { get: () => false }
  };
  const res = createMockRes();
  let nextCalled = false;
  csrfProtection(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('SEC-02: csrfProtection rejects forged X-Forwarded-Host when trust proxy is false', () => {
  const req = {
    method: 'POST',
    originalUrl: '/api/journal/notebooks/test-nb',
    cookies: { access_token: 'dummy' },
    headers: {
      host: 'betweenletters.example',
      origin: 'https://attacker.example',
      'x-forwarded-host': 'attacker.example'
    },
    app: { get: () => false }
  };
  const res = createMockRes();
  let nextCalled = false;
  csrfProtection(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('SEC-02: csrfProtection allows valid Origin matching APP_URL', () => {
  const req = {
    method: 'POST',
    originalUrl: '/api/journal/notebooks/test-nb',
    cookies: { access_token: 'dummy' },
    headers: {
      host: 'betweenletters.example',
      origin: 'https://betweenletters.example'
    },
    app: { get: () => false }
  };
  const res = createMockRes();
  let nextCalled = false;
  csrfProtection(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('SEC-04: resolvePublicAppUrl ignores spoofed Origin and X-Forwarded-Host', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevAppUrl = process.env.APP_URL;
  try {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://betweenletters.example';
    const url = resolvePublicAppUrl({
      headers: {
        origin: 'https://attacker.example',
        'x-forwarded-host': 'attacker.example',
        host: 'attacker.example'
      }
    });
    assert.equal(url, 'https://betweenletters.example');

    // Fails closed in production when APP_URL is localhost
    process.env.APP_URL = 'http://localhost:3000';
    assert.throws(() => resolvePublicAppUrl({ headers: { origin: 'https://attacker.example' } }), /HTTPS URL in production/);
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
    process.env.APP_URL = prevAppUrl;
  }
});

test('SEC-10: verifyCodeLimiter shares a single budget across /verify-code and /verify-email aliases', () => {
  const ip = '198.51.100.77';
  let blockedAt = -1;
  for (let i = 1; i <= 10; i++) {
    const req = {
      ip,
      baseUrl: '/api/auth',
      path: i % 2 === 0 ? '/verify-email' : '/verify-code',
      originalUrl: i % 2 === 0 ? '/api/auth/verify-email' : '/api/auth/verify-code',
      body: { email: 'alias-test@example.com' }
    };
    const res = createMockRes();
    let passed = false;
    verifyCodeLimiter(req, res, () => { passed = true; });
    if (!passed && res.statusCode === 429) {
      blockedAt = i;
      break;
    }
  }
  assert.equal(blockedAt, 9, 'Should block on 9th request across alternating aliases (limit 8)');
});

test('SEC-18: validateRegistrationInput enforces 8-72 byte password policy', () => {
  const runVal = (senha) => {
    const req = { body: { nome: 'Jane Reader', email: 'jane@example.com', senha } };
    const res = createMockRes();
    let passed = false;
    validateRegistrationInput(req, res, () => { passed = true; });
    return { passed, status: res.statusCode };
  };
  assert.equal(runVal('1234567').passed, false);
  assert.equal(runVal('a'.repeat(73)).passed, false);
  assert.equal(runVal('StrongPass123!').passed, true);
});

test('SEC-20: securityHeaders emits HSTS only when req.secure is true', () => {
  const resHttp = createMockRes();
  securityHeaders({ secure: false }, resHttp, () => {});
  assert.equal(resHttp.headers['strict-transport-security'], undefined);
  assert.equal(resHttp.headers['x-frame-options'], 'DENY');
  assert.equal(resHttp.headers['x-content-type-options'], 'nosniff');

  const resHttps = createMockRes();
  securityHeaders({ secure: true }, resHttps, () => {});
  assert.match(resHttps.headers['strict-transport-security'], /max-age=31536000/);
});
