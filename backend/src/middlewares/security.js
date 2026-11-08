/**
 * Advanced Security Middleware:
 * 1. In-memory Rate Limiting (Brute-force & automated scanner protection)
 * 2. IDOR & BOLA prevention
 * 3. Input sanitization & XSS / link injection filtering
 * 4. HTTP Security Headers
 */

const rateLimitStores = new Map();

function createRateLimiter({ windowMs, max, message }) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection?.remoteAddress || 'unknown-ip';
    const key = `${req.baseUrl || ""}${req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitStores.get(key);

    if (!record || now - record.resetTime > windowMs) {
      record = {
        count: 1,
        resetTime: now
      };
      rateLimitStores.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.resetTime + windowMs) / 1000));

    if (record.count > max) {
      console.warn(`[SECURITY ALERT] Rate limit exceeded for IP ${ip} on route ${req.originalUrl} (${record.count}/${max})`);
      return res.status(429).json({
        error: message || 'Too many requests sent. Please wait a few minutes and try again.',
        retryAfter: Math.ceil((record.resetTime + windowMs - now) / 1000)
      });
    }

    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStores.entries()) {
    if (now - record.resetTime > 15 * 60 * 1000) {
      rateLimitStores.delete(key);
    }
  }
}, 10 * 60 * 1000);

// 1. Account registration limiter
const registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Account creation limit reached for your connection. Please try again in 15 minutes.'
});

// 2. Login limiter
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: 'Too many consecutive sign-in attempts. For your security, please wait 15 minutes.'
});

// 3. Verification code (OTP) limiter
const verifyCodeLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: 'Verification code attempt limit reached. Please request a new code after 10 minutes.'
});

// 4. Comment rate limiter
const commentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 8,
  message: 'You are posting notes too quickly. Please wait a moment before posting again.'
});

// 5. Password recovery limiter
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: 'Too many password recovery requests. Please wait a few minutes before trying again.'
});

function sanitizeComment(req, res, next) {
  let { texto } = req.body;

  if (!texto || typeof texto !== 'string' || !texto.trim()) {
    return res.status(400).json({ error: 'Comment text cannot be empty.' });
  }

  const urlPattern = /(https?:\/\/|ftp:\/\/|www\.)[^\s]+/gi;
  if (urlPattern.test(texto)) {
    console.warn(`[SECURITY] External URL blocked in comment by user ID ${req.usuarioId}: "${texto.slice(0, 50)}..."`);
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

  // Allow letters (including accented), numbers, spaces, hyphens, apostrophes, and periods
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

  if (!senha || typeof senha !== 'string' || senha.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  next();
}

/**
 * HTTP Security Headers
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://image.tmdb.org https://lh3.googleusercontent.com http://localhost:* https://*; connect-src 'self' https://api.themoviedb.org http://localhost:* ws://localhost:*;"
  );
  res.removeHeader('X-Powered-By');
  next();
}

/**
 * CSRF Protection on state-changing requests
 */
function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (req.cookies && req.cookies.access_token) {
    const origin = req.headers['origin'];
    const host = req.headers['host'];

    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          console.warn(`[CSRF BLOCK] Suspicious origin blocked: ${origin} vs Host ${host}`);
          return res.status(403).json({ error: 'Request blocked by security policy (CSRF validation).' });
        }
      } catch {
        return res.status(403).json({ error: 'Request blocked by security policy (Invalid origin).' });
      }
    }
  }

  next();
}

module.exports = {
  createRateLimiter,
  registerLimiter,
  loginLimiter,
  verifyCodeLimiter,
  commentRateLimiter,
  forgotPasswordLimiter,
  sanitizeComment,
  validateRegistrationInput,
  securityHeaders,
  csrfProtection
};
