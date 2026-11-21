/**
 * Advanced Security Middleware:
 * 1. Rate Limiting with normalized route-alias buckets & optional per-email keys
 * 2. Strict CORS origin allowlist helper
 * 3. Input sanitization & registration validation (8-72 byte password policy)
 * 4. Hardened HTTP Security Headers & HTTPS-only HSTS
 * 5. Origin/Referer CSRF validation respecting Express trust proxy
 */

const rateLimitStores = new Map();
const MAX_RATE_LIMIT_ENTRIES = 10000;

function evictStaleRateLimitEntries(now) {
  for (const [k, rec] of rateLimitStores.entries()) {
    if (now - rec.resetTime > (rec.windowMs || 15 * 60 * 1000)) {
      rateLimitStores.delete(k);
    }
  }
}

function getAllowedOrigins() {
  const origins = new Set();
  const isProd = process.env.NODE_ENV === 'production';

  const addOrigin = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    try {
      const u = new URL(trimmed);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        origins.add(u.origin.toLowerCase());
      }
    } catch {}
  };

  addOrigin(process.env.APP_URL);
  if (process.env.ALLOWED_ORIGINS) {
    for (const part of String(process.env.ALLOWED_ORIGINS).split(',')) {
      addOrigin(part);
    }
  }
  if (process.env.ALLOWED_APP_HOSTS) {
    for (const host of String(process.env.ALLOWED_APP_HOSTS).split(',')) {
      const h = host.trim();
      if (!h) continue;
      if (h.startsWith('http://') || h.startsWith('https://')) {
        addOrigin(h);
      } else {
        addOrigin(`https://${h}`);
        if (!isProd) addOrigin(`http://${h}`);
      }
    }
  }

  if (!isProd) {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  return origins;
}

function createRateLimiter({ windowMs, max, message, bucket, includeEmail = false }) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
    const bucketKey = bucket || `${req.baseUrl || ''}${req.path}`;
    const now = Date.now();
    const keys = [`${bucketKey}:ip:${ip}`];

    if (includeEmail && req.body && typeof req.body.email === 'string' && req.body.email.trim()) {
      keys.push(`${bucketKey}:email:${req.body.email.trim().toLowerCase()}`);
    }

    let maxCount = 0;
    let activeReset = now + windowMs;

    for (const key of keys) {
      let record = rateLimitStores.get(key);

      if (!record || now - record.resetTime > windowMs) {
        if (!record && rateLimitStores.size >= MAX_RATE_LIMIT_ENTRIES) {
          evictStaleRateLimitEntries(now);
          while (rateLimitStores.size >= MAX_RATE_LIMIT_ENTRIES) {
            const oldestKey = rateLimitStores.keys().next().value;
            if (oldestKey === undefined) break;
            rateLimitStores.delete(oldestKey);
          }
        }
        record = {
          count: 1,
          resetTime: now,
          windowMs
        };
        rateLimitStores.set(key, record);
      } else {
        record.count += 1;
      }

      if (record.count > maxCount) {
        maxCount = record.count;
        activeReset = record.resetTime + windowMs;
      }
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - maxCount));
    res.setHeader('X-RateLimit-Reset', Math.ceil(activeReset / 1000));

    if (maxCount > max) {
      console.warn(`[SECURITY ALERT] Rate limit exceeded for IP ${ip} on bucket ${bucketKey} (${maxCount}/${max})`);
      return res.status(429).json({
        error: message || 'Too many requests sent. Please wait a few minutes and try again.',
        retryAfter: Math.max(1, Math.ceil((activeReset - now) / 1000))
      });
    }

    next();
  };
}

setInterval(() => {
  evictStaleRateLimitEntries(Date.now());
}, 10 * 60 * 1000).unref();

// 1. Account registration limiter
const registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  bucket: 'auth:register',
  includeEmail: true,
  message: 'Account creation limit reached for your connection. Please try again in 15 minutes.'
});

// 2. Login limiter
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  bucket: 'auth:login',
  includeEmail: true,
  message: 'Too many consecutive sign-in attempts. For your security, please wait 15 minutes.'
});

// 3. Verification code (OTP) limiter (shared across /verify-code and /verify-email aliases)
const verifyCodeLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  bucket: 'auth:verify-code',
  includeEmail: true,
  message: 'Verification code attempt limit reached. Please request a new code after 10 minutes.'
});

// 4. Resend verification code limiter (shared across /resend-code and /resend-verification aliases)
const resendCodeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  bucket: 'auth:resend-code',
  includeEmail: true,
  message: 'Too many verification code requests. Please wait 15 minutes before requesting another code.'
});

// 5. Comment & letter note rate limiter
const commentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 8,
  bucket: 'content:comment',
  message: 'You are posting notes too quickly. Please wait a moment before posting again.'
});

// 6. Password recovery limiter
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 6,
  bucket: 'auth:forgot-password',
  includeEmail: true,
  message: 'Too many password recovery requests. Please wait a few minutes before trying again.'
});

// 7. Password reset token validation limiter
const resetValidateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  bucket: 'auth:reset-validate',
  message: 'Too many recovery token checks. Please wait a few minutes before trying again.'
});

// 8. Media upload rate limiter
const uploadRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  bucket: 'media:upload',
  message: 'Too many image uploads in a short period. Please wait a few minutes and try again.'
});

function sanitizeComment(req, res, next) {
  let { texto } = req.body;

  if (!texto || typeof texto !== 'string' || !texto.trim()) {
    return res.status(400).json({ error: 'Comment text cannot be empty.' });
  }

  const urlPattern = /(https?:\/\/|ftp:\/\/|www\.)[^\s]+/gi;
  if (urlPattern.test(texto)) {
    console.warn(`[SECURITY] External URL blocked in comment by user ID ${req.usuarioId}`);
    return res.status(400).json({
      error: 'For security and spam prevention, notes cannot contain external links or URLs.'
    });
  }

  texto = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();

  if (texto.length > 800) {
    return res.status(400).json({ error: 'Note exceeds the maximum length of 800 characters.' });
  }

  req.body.texto = texto;
  next();
}

/**
 * Strict validation for user registration input
 */
function validateRegistrationInput(req, res, next) {
  const { nome, email, senha } = req.body;

  if (!nome || typeof nome !== 'string' || nome.trim().length < 2 || nome.trim().length > 80) {
    return res.status(400).json({ error: 'Full name must be between 2 and 80 characters.' });
  }

  const validNameRegex = /^[a-zA-ZÀ-ÿ0-9 '.\-]+$/;
  if (!validNameRegex.test(nome.trim())) {
    return res.status(400).json({ error: 'Name contains invalid characters. Please use letters, spaces, or standard punctuation.' });
  }

  const blockedTerms = ['admin', 'root', 'administrator', 'moderator', 'nigga', 'nigger'];
  const lowerName = nome.trim().toLowerCase();
  for (const term of blockedTerms) {
    if (lowerName.includes(term)) {
      return res.status(400).json({ error: 'This name is restricted or invalid.' });
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (!senha || typeof senha !== 'string' || senha.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }
  if (Buffer.byteLength(senha, 'utf8') > 72) {
    return res.status(400).json({ error: 'Password must not exceed 72 bytes.' });
  }

  next();
}

/**
 * HTTP Security Headers (HTTPS-only HSTS via Express req.secure + hardened CSP)
 */
function securityHeaders(req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Emit HSTS only when the connection is genuinely HTTPS according to Express trust proxy
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  const devConnect = isProd ? '' : ' http://localhost:* ws://localhost:*';
  const devImg = isProd ? '' : ' http://localhost:*';
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://image.tmdb.org https://lh3.googleusercontent.com https://*${devImg}; connect-src 'self' https://api.themoviedb.org${devConnect};`
  );
  res.removeHeader('X-Powered-By');
  next();
}

/**
 * CSRF Protection on cookie-authenticated state-changing requests.
 * Requires Origin or Referer matching allowed origins; never trusts X-Forwarded-Host when trust proxy is false.
 */
function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt Stripe webhook (verified by cryptographic Stripe-Signature header, not cookies)
  if (req.originalUrl && req.originalUrl.startsWith('/api/stripe/webhook')) {
    return next();
  }

  const hasAuthCookie = Boolean(req.cookies && (req.cookies.access_token || req.cookies.refresh_token));
  if (!hasAuthCookie) {
    return next();
  }

  const allowedOrigins = getAllowedOrigins();
  const allowedHosts = new Set();
  for (const o of allowedOrigins) {
    try {
      allowedHosts.add(new URL(o).host.toLowerCase());
    } catch {}
  }

  if (req.headers['host']) {
    allowedHosts.add(String(req.headers['host']).split(',')[0].trim().toLowerCase());
  }
  if (req.app && req.app.get('trust proxy') && req.headers['x-forwarded-host']) {
    for (const h of String(req.headers['x-forwarded-host']).split(',')) {
      if (h.trim()) allowedHosts.add(h.trim().toLowerCase());
    }
  }

  const originHeader = req.headers['origin'];
  const refererHeader = req.headers['referer'];
  const candidate = originHeader || refererHeader;

  if (!candidate) {
    console.warn(`[CSRF BLOCK] Missing Origin and Referer on cookie-authenticated ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ error: 'Request blocked by security policy (Missing origin).' });
  }

  try {
    const parsed = new URL(String(candidate));
    const exactMatch = allowedOrigins.has(parsed.origin.toLowerCase());
    const hostMatch = allowedHosts.has(parsed.host.toLowerCase());
    if (!exactMatch && !hostMatch) {
      console.warn(`[CSRF BLOCK] Untrusted origin blocked: ${parsed.origin}`);
      return res.status(403).json({ error: 'Request blocked by security policy (CSRF validation).' });
    }
  } catch {
    return res.status(403).json({ error: 'Request blocked by security policy (Invalid origin).' });
  }

  return next();
}

module.exports = {
  getAllowedOrigins,
  createRateLimiter,
  registerLimiter,
  loginLimiter,
  verifyCodeLimiter,
  resendCodeLimiter,
  commentRateLimiter,
  forgotPasswordLimiter,
  resetValidateLimiter,
  uploadRateLimiter,
  sanitizeComment,
  validateRegistrationInput,
  securityHeaders,
  csrfProtection
};
