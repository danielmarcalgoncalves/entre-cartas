require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const trustProxyRaw = String(process.env.TRUST_PROXY || '').trim().toLowerCase();
const trustProxyValue =
  !trustProxyRaw || trustProxyRaw === 'false' || trustProxyRaw === '0'
    ? false
    : trustProxyRaw === 'true'
    ? true
    : /^\d+$/.test(trustProxyRaw)
    ? Number(trustProxyRaw)
    : process.env.TRUST_PROXY.trim();
app.set('trust proxy', trustProxyValue);
// Internal-only service: do not expose wildcard browser CORS
app.use(express.json({ limit: '100kb' }));

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '30m';
const REFRESH_TOKEN_DAYS_DEFAULT = 7;
const REFRESH_TOKEN_DAYS_REMEMBER = 30;

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function maskEmail(email) {
  const s = String(email || '');
  if (!s.includes('@')) return '***';
  const [local, domain] = s.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

function validatePasswordPolicy(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return 'Password must not exceed 72 bytes.';
  }
  return null;
}

function hashTokenValue(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken).trim()).digest('hex');
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
  throw new Error('[SECURITY] JWT_SECRET must be configured and at least 32 characters long.');
}
const JWT_SECRET = process.env.JWT_SECRET.trim();
const INTERNAL_AUTH_SECRET = crypto.createHmac('sha256', JWT_SECRET).update('internal-auth-service').digest('hex');
const INTERNAL_LOG_SECRET = crypto.createHmac('sha256', JWT_SECRET).update('internal-log-service').digest('hex');
const AUTHORIZED_ADMIN_EMAIL = 'danielpgmarcal@gmail.com';

function isAuthorizedAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL;
}

function resolveEffectiveUserRole(email, dbPapel) {
  if (isAuthorizedAdminEmail(email)) return 'admin';
  if (dbPapel === 'admin') return 'usuario';
  return dbPapel || 'usuario';
}

const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || 'http://log-service:3000';

function sendLog(acao, req = null, detalhes = {}) {
  try {
    let usuarioId = 'anonimo';
    let clientIp = '127.0.0.1';
    let requestMeta = {};

    if (req) {
      if (req.usuarioId) {
        usuarioId = String(req.usuarioId);
      } else if (req.usuario && req.usuario.id) {
        usuarioId = String(req.usuario.id);
      } else if (detalhes && detalhes.usuario_id) {
        usuarioId = String(detalhes.usuario_id);
      }

      clientIp =
        req.ip ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

      requestMeta = {
        metodo: req.method,
        rota: req.originalUrl || req.url
      };
    } else if (detalhes && detalhes.usuario_id) {
      usuarioId = String(detalhes.usuario_id);
    }

    const payload = {
      usuario_id: usuarioId,
      acao: String(acao).toUpperCase(),
      timestamp: new Date().toISOString(),
      ip: clientIp,
      detalhes: typeof detalhes === 'object' ? { ...requestMeta, ...detalhes } : { ...requestMeta, info: detalhes }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    fetch(`${LOG_SERVICE_URL}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Log-Secret': INTERNAL_LOG_SECRET
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then(() => clearTimeout(timeoutId))
      .catch(() => clearTimeout(timeoutId));
  } catch (err) {
    // Silent to avoid interrupting auth flows
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mariadb',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root_password',
  database: process.env.DB_NAME || 'filmes_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

const DB_CONNECTIVITY_CODES = new Set([
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'PROTOCOL_CONNECTION_LOST',
  'ECONNRESET',
  'ER_ACCESS_DENIED_ERROR'
]);

function isDbConnectivityError(err) {
  return Boolean(err && err.code && DB_CONNECTIVITY_CODES.has(err.code));
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    return res.status(503).json({ status: 'degraded', database: 'unavailable', code: err.code || 'DB_ERROR' });
  }
});

// Safe schema migration on startup with retries so cold-start MariaDB boots succeed cleanly
async function ensureAuthSchema(retries = 15, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await pool.getConnection();
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            senha_hash VARCHAR(255) NOT NULL,
            papel VARCHAR(50) DEFAULT 'usuario',
            email_verificado BOOLEAN DEFAULT FALSE,
            foto_url VARCHAR(500) DEFAULT NULL,
            bio TEXT DEFAULT NULL,
            auth_provider VARCHAR(50) DEFAULT 'local',
            google_id VARCHAR(255) DEFAULT NULL,
            ultimo_login TIMESTAMP NULL DEFAULT NULL,
            status_conta VARCHAR(30) DEFAULT 'ativo',
            onboarding_concluido BOOLEAN DEFAULT FALSE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS reset_tokens (
            token VARCHAR(255) PRIMARY KEY,
            usuario_id INT NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expira_em TIMESTAMP NOT NULL,
            usado BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS codigos_verificacao (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(150) NOT NULL,
            codigo VARCHAR(10) NOT NULL,
            expira_em DATETIME NOT NULL,
            usado BOOLEAN DEFAULT FALSE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_email_codigo (email, codigo)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS revoked_tokens (
            token_hash VARCHAR(64) PRIMARY KEY,
            usuario_id INT NULL,
            expira_em DATETIME NOT NULL,
            revogado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_expira (expira_em)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token_hash VARCHAR(64) UNIQUE NOT NULL,
            family_id VARCHAR(64) NOT NULL,
            usuario_id INT NOT NULL,
            remember_me BOOLEAN DEFAULT FALSE,
            expira_em DATETIME NOT NULL,
            usado BOOLEAN DEFAULT FALSE,
            revogado BOOLEAN DEFAULT FALSE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_rt_family (family_id),
            INDEX idx_rt_usuario (usuario_id),
            INDEX idx_rt_expira (expira_em),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        const alterQueries = [
          `ALTER TABLE usuarios ADD COLUMN papel VARCHAR(50) DEFAULT 'usuario'`,
          `ALTER TABLE usuarios ADD COLUMN email_verificado BOOLEAN DEFAULT FALSE`,
          `ALTER TABLE usuarios ADD COLUMN foto_url VARCHAR(500) DEFAULT NULL`,
          `ALTER TABLE usuarios ADD COLUMN bio TEXT DEFAULT NULL`,
          `ALTER TABLE usuarios ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local'`,
          `ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) DEFAULT NULL`,
          `ALTER TABLE usuarios ADD COLUMN ultimo_login TIMESTAMP NULL DEFAULT NULL`,
          `ALTER TABLE usuarios ADD COLUMN status_conta VARCHAR(30) DEFAULT 'ativo'`,
          `ALTER TABLE usuarios ADD COLUMN onboarding_concluido BOOLEAN DEFAULT FALSE`,
          `ALTER TABLE usuarios ADD COLUMN token_version INT NOT NULL DEFAULT 1`
        ];

        for (const q of alterQueries) {
          try {
            await conn.query(q);
          } catch (e) {
            // Column already exists
          }
        }
        try {
          await conn.query(
            `UPDATE usuarios SET papel = 'admin' WHERE LOWER(TRIM(email)) = ? AND papel != 'admin'`,
            [AUTHORIZED_ADMIN_EMAIL]
          );
          await conn.query(
            `UPDATE usuarios SET papel = 'usuario' WHERE LOWER(TRIM(email)) != ? AND papel = 'admin'`,
            [AUTHORIZED_ADMIN_EMAIL]
          );
        } catch (e) {}
        return;
      } finally {
        conn.release();
      }
    } catch (err) {
      if (attempt === retries) {
        console.warn('[Auth-Service] Schema initialization deferred:', err.message);
      } else {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

ensureAuthSchema();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.MAIL_PORT, 10) || 587,
  secure: String(process.env.MAIL_PORT) === '465',
  auth: {
    user: process.env.MAIL_USER || 'fake_user',
    pass: process.env.MAIL_PASS || 'fake_pass'
  },
  tls: {
    rejectUnauthorized: true
  }
});

// Helper to parse sender email & name from env variables
function resolveSenderIdentity() {
  const senderName = process.env.BREVO_SENDER_NAME || 'Between Letters';
  let senderEmail = process.env.BREVO_SENDER_EMAIL || '';

  if (!senderEmail && process.env.MAIL_FROM) {
    const match = process.env.MAIL_FROM.match(/<([^>]+)>/);
    if (match && match[1]) {
      senderEmail = match[1].trim();
    } else if (process.env.MAIL_FROM.includes('@')) {
      senderEmail = process.env.MAIL_FROM.trim();
    }
  }

  if (!senderEmail && process.env.MAIL_USER && process.env.MAIL_USER.includes('@')) {
    senderEmail = process.env.MAIL_USER.trim();
  }

  if (!senderEmail) {
    senderEmail = 'no-reply@betweenletters.app';
  }

  return {
    name: senderName,
    email: senderEmail,
    formattedFrom: `"${senderName}" <${senderEmail}>`
  };
}

/**
 * Unified Brevo Transactional Email Dispatcher
 * Supports both Brevo v3 HTTP API (BREVO_API_KEY) and Brevo SMTP Relay (MAIL_HOST / MAIL_USER / MAIL_PASS).
 */
async function sendTransactionalEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  const sender = resolveSenderIdentity();
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();

  // 1. Try Brevo Official v3 HTTP Transactional API if BREVO_API_KEY is configured
  if (brevoApiKey && !brevoApiKey.startsWith('sua_') && !brevoApiKey.startsWith('your_')) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: sender.name, email: sender.email },
          to: [{ email: toEmail, name: toName || toEmail }],
          subject,
          htmlContent,
          textContent
        })
      });

      if (response.ok) {
        return { delivered: true, transport: 'brevo-api' };
      }
      const errBody = await response.text().catch(() => '');
      console.warn(`[Brevo API] Non-200 status (${response.status}), falling back to SMTP:`, errBody);
    } catch (apiErr) {
      console.warn('[Brevo API] Request error, falling back to SMTP:', apiErr.message);
    }
  }

  // 2. Send via Brevo SMTP Relay (nodemailer)
  await transporter.sendMail({
    from: sender.formattedFrom,
    to: toEmail,
    subject,
    html: htmlContent,
    text: textContent
  });

  return { delivered: true, transport: 'brevo-smtp' };
}

/**
 * Shared warm stationery HTML wrapper for Between Letters emails
 */
function buildStationeryEmailLayout({ preheader, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Between Letters</title>
</head>
<body style="margin: 0; padding: 0; background-color: #e8dfd1; font-family: Georgia, 'Times New Roman', Times, serif; color: #2d2319; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
    ${preheader || 'Between Letters — A place for things worth remembering.'}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #e8dfd1; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Kraft Tape Accent -->
        <div style="width: 110px; height: 26px; background-color: #b89867; margin: 0 auto -13px auto; position: relative; z-index: 2; box-shadow: 0 2px 6px rgba(45, 35, 25, 0.16); border: 1px solid rgba(140, 110, 68, 0.35);"></div>
        <!-- Aged Paper Sheet -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #f9f3e8; border: 1px solid #dfd3be; box-shadow: 0 14px 36px rgba(45, 35, 25, 0.12); padding: 48px 42px 40px 42px; text-align: left;">
          <tr>
            <td>
              <div style="text-align: center; margin-bottom: 32px; border-bottom: 1px solid #e5dac6; padding-bottom: 18px;">
                <span style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #8c775c; display: block; margin-bottom: 6px;">
                  ✦ PERSONAL JOURNAL SANCTUARY ✦
                </span>
                <span style="font-size: 22px; font-weight: normal; letter-spacing: 1.5px; color: #2d2319; font-family: Georgia, 'Times New Roman', serif;">
                  BETWEEN LETTERS
                </span>
              </div>
              ${bodyHtml}
              <div style="margin-top: 38px; padding-top: 20px; border-top: 1px solid #e5dac6; text-align: center; font-size: 12px; color: #8c775c; line-height: 1.6;">
                Between Letters &bull; For everything that still finds words.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Welcome Email (Brevo)
 */
async function sendWelcomeEmail(email, nome) {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const deskUrl = `${appUrl}/my-desk`;
  const safeName = (nome || 'Reader').trim();
  const safeNameHtml = escapeHtml(safeName);

  const bodyHtml = `
    <p style="font-size: 17px; line-height: 1.7; color: #2d2319; margin: 0 0 18px 0;">
      Dear <strong>${safeNameHtml}</strong>,
    </p>
    <p style="font-size: 16px; line-height: 1.75; color: #433526; margin: 0 0 18px 0; font-style: italic;">
      Some thoughts deserve a place to stay.
    </p>
    <p style="font-size: 15px; line-height: 1.75; color: #433526; margin: 0 0 18px 0;">
      Welcome to <strong>Between Letters</strong> — a quiet space created for your memories, reflections, journals, and stories.
    </p>
    <p style="font-size: 15px; line-height: 1.75; color: #433526; margin: 0 0 18px 0;">
      Your personal journal is ready whenever you are.
    </p>
    <p style="font-size: 15px; line-height: 1.75; color: #433526; margin: 0 0 28px 0;">
      Take your time. Write freely. Keep what matters.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${deskUrl}" style="display: inline-block; background-color: #5c4328; color: #f9f3e8; text-decoration: none; padding: 13px 30px; font-size: 14px; letter-spacing: 1px; border: 1px solid #47321b; border-radius: 2px;">
        Open My Desk &rarr;
      </a>
    </div>
    <p style="font-size: 15px; line-height: 1.7; color: #2d2319; margin: 28px 0 0 0;">
      With warmth,<br />
      <em>Between Letters</em>
    </p>
  `;

  const textContent = `Dear ${safeName},\n\nSome thoughts deserve a place to stay.\n\nWelcome to Between Letters — a quiet space created for your memories, reflections, journals, and stories.\n\nYour personal journal is ready whenever you are.\n\nTake your time. Write freely. Keep what matters.\n\nOpen your desk: ${deskUrl}\n\nWith warmth,\nBetween Letters`;

  return sendTransactionalEmail({
    toEmail: email,
    toName: safeName,
    subject: 'Welcome to Between Letters',
    htmlContent: buildStationeryEmailLayout({
      preheader: 'Some thoughts deserve a place to stay. Welcome to Between Letters.',
      bodyHtml
    }),
    textContent
  });
}

/**
 * 2. Password Recovery Email (Brevo)
 */
async function sendPasswordRecoveryEmail(email, nome, resetLink) {
  const safeName = (nome || 'Reader').trim();
  const safeNameHtml = escapeHtml(safeName);

  const bodyHtml = `
    <p style="font-size: 17px; line-height: 1.7; color: #2d2319; margin: 0 0 18px 0;">
      Dear <strong>${safeNameHtml}</strong>,
    </p>
    <p style="font-size: 16px; line-height: 1.75; color: #433526; margin: 0 0 18px 0; font-style: italic;">
      Sometimes we lose the key to a place that matters.
    </p>
    <p style="font-size: 15px; line-height: 1.75; color: #433526; margin: 0 0 26px 0;">
      You can create a new password and return to your personal space using the button below.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetLink}" style="display: inline-block; background-color: #5c4328; color: #f9f3e8; text-decoration: none; padding: 13px 30px; font-size: 14px; letter-spacing: 1px; border: 1px solid #47321b; border-radius: 2px;">
        Reset My Password
      </a>
    </div>
    <p style="font-size: 13px; line-height: 1.65; color: #6e5c46; margin: 0 0 18px 0;">
      This link is temporary and can only be used once. If the button above does not open, copy and paste this address into your browser:<br />
      <a href="${resetLink}" style="color: #7c562e; word-break: break-all;">${resetLink}</a>
    </p>
    <p style="font-size: 15px; line-height: 1.7; color: #2d2319; margin: 28px 0 0 0;">
      With warmth,<br />
      <em>Between Letters</em>
    </p>
  `;

  const textContent = `Dear ${safeName},\n\nSometimes we lose the key to a place that matters.\n\nYou can create a new password and return to your personal space using the link below:\n\n${resetLink}\n\nThis link is temporary and can only be used once.\n\nWith warmth,\nBetween Letters`;

  return sendTransactionalEmail({
    toEmail: email,
    toName: safeName,
    subject: 'Reset your Between Letters password',
    htmlContent: buildStationeryEmailLayout({
      preheader: 'Create a new password and return to your personal space in Between Letters.',
      bodyHtml
    }),
    textContent
  });
}

/**
 * 3. Email Verification Code (OTP) Email (Brevo)
 */
async function sendVerificationEmail(email, nome, codigo) {
  const safeName = (nome || 'Reader').trim();
  const safeNameHtml = escapeHtml(safeName);

  const bodyHtml = `
    <p style="font-size: 17px; line-height: 1.7; color: #2d2319; margin: 0 0 18px 0;">
      Dear <strong>${safeNameHtml}</strong>,
    </p>
    <p style="font-size: 15px; line-height: 1.75; color: #433526; margin: 0 0 22px 0;">
      Thank you for beginning your story with <strong>Between Letters</strong>. Please enter the verification code below to confirm your email address:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="display: inline-block; background-color: #f1e7d6; border: 1px solid #c8b496; padding: 14px 32px; letter-spacing: 8px; font-size: 28px; font-weight: bold; color: #47321b; font-family: 'Courier New', Courier, monospace;">
        ${codigo}
      </div>
      <p style="color: #7c6850; font-size: 12px; margin-top: 10px;">
        Valid for 15 minutes
      </p>
    </div>
    <p style="font-size: 13px; line-height: 1.6; color: #6e5c46; margin: 0 0 18px 0;">
      If you did not request this code, you may safely disregard this message.
    </p>
    <p style="font-size: 15px; line-height: 1.7; color: #2d2319; margin: 24px 0 0 0;">
      With warmth,<br />
      <em>Between Letters</em>
    </p>
  `;

  const textContent = `Dear ${safeName},\n\nYour Between Letters verification code is: ${codigo}\n\nValid for 15 minutes.\n\nWith warmth,\nBetween Letters`;

  return sendTransactionalEmail({
    toEmail: email,
    toName: safeName,
    subject: `Your verification code: ${codigo} — Between Letters`,
    htmlContent: buildStationeryEmailLayout({
      preheader: `Your Between Letters verification code is ${codigo}`,
      bodyHtml
    }),
    textContent
  });
}

// In-memory rate limiting in auth-service (never trusts raw X-Forwarded-For; uses Express req.ip + optional logical bucket + per-email key)
const authRateLimitMap = new Map();
function rateLimit(windowMs, maxReqs, customMsg, options = {}) {
  const bucketName = options.bucket || null;
  const includeEmail = Boolean(options.includeEmail);
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
    const bucket = bucketName || req.path;
    const now = Date.now();
    const keys = [`${bucket}:ip:${ip}`];
    if (includeEmail && req.body && typeof req.body.email === 'string' && req.body.email.trim()) {
      keys.push(`${bucket}:email:${req.body.email.trim().toLowerCase()}`);
    }
    for (const key of keys) {
      let item = authRateLimitMap.get(key);
      if (!item || now - item.time > windowMs) {
        item = { count: 1, time: now };
        authRateLimitMap.set(key, item);
      } else {
        item.count++;
      }
      if (item.count > maxReqs) {
        return res.status(429).json({ error: customMsg || 'Too many attempts. Please wait a few minutes and try again.' });
      }
    }
    next();
  };
}

async function issueSessionTokens({ id, nome, email, papel, tokenVersion = 1 }, rememberMe = false, existingFamilyId = null, db = pool) {
  const accessToken = jwt.sign(
    { id, nome, email, papel, tv: tokenVersion || 1 },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL, jwtid: crypto.randomUUID() }
  );
  const rawRefreshToken = crypto.randomBytes(48).toString('hex');
  const refreshHash = hashTokenValue(rawRefreshToken);
  const familyId = existingFamilyId || crypto.randomBytes(16).toString('hex');
  const ttlDays = rememberMe ? REFRESH_TOKEN_DAYS_REMEMBER : REFRESH_TOKEN_DAYS_DEFAULT;
  const expiraEm = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO refresh_tokens (token_hash, family_id, usuario_id, remember_me, expira_em)
     VALUES (?, ?, ?, ?, ?)`,
    [refreshHash, familyId, id, Boolean(rememberMe), expiraEm]
  );

  return { token: accessToken, refreshToken: rawRefreshToken, rememberMe: Boolean(rememberMe) };
}

// Track failed OTP verification attempts (anti-brute-force)
const failedVerifyAttempts = new Map();

function hashRecoveryToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken).trim()).digest('hex');
}

const authMiddleware = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) return res.status(401).json({ error: 'Authentication token not provided.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [revoked] = await pool.query('SELECT 1 FROM revoked_tokens WHERE token_hash = ? LIMIT 1', [tokenHash]);
    if (revoked.length > 0) {
      return res.status(401).json({ error: 'Session has been logged out or revoked.' });
    }

    const [users] = await pool.query('SELECT id, nome, email, papel, token_version, email_verificado, foto_url, bio, auth_provider, onboarding_concluido FROM usuarios WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'User account not found or revoked.' });
    }

    const usuarioDb = users[0];
    if ((decoded.tv || 1) !== (usuarioDb.token_version || 1)) {
      return res.status(401).json({ error: 'Session invalidated due to password change or security update.' });
    }
    const papelFinal = resolveEffectiveUserRole(usuarioDb.email, usuarioDb.papel);
    if (papelFinal !== usuarioDb.papel) {
      await pool.query('UPDATE usuarios SET papel = ? WHERE id = ?', [papelFinal, usuarioDb.id]).catch(() => {});
    }
    req.usuarioId = usuarioDb.id;
    req.usuarioPapel = papelFinal;
    req.usuario = {
      ...usuarioDb,
      papel: papelFinal,
      role: papelFinal
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

// =========================================================================
// 1. USER REGISTRATION (/register)
// =========================================================================
app.post('/register', rateLimit(15 * 60 * 1000, 10, 'Registration limit reached for this address. Please wait 15 minutes.'), async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Full name, email address, and password are required.' });
    }
    const pwErr = validatePasswordPolicy(String(senha));
    if (pwErr) {
      return res.status(400).json({ error: pwErr });
    }

    const trimmedName = String(nome).trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      return res.status(400).json({ error: 'Full name must be between 2 and 80 characters.' });
    }

    const blockedTerms = ['nigga', 'nigger', 'admin', 'root', 'administrator'];
    const lowerName = trimmedName.toLowerCase();
    if (blockedTerms.some(t => lowerName.includes(t))) {
      return res.status(400).json({ error: 'This name is restricted or invalid.' });
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const papelFinal = isAuthorizedAdminEmail(emailTrimmed) ? 'admin' : 'usuario';
    const requireOtpFlow = String(process.env.REQUIRE_EMAIL_VERIFICATION || '').toLowerCase() === 'true';

    const [existing] = await pool.query('SELECT id, nome, email_verificado FROM usuarios WHERE email = ?', [emailTrimmed]);

    if (existing.length > 0) {
      if (requireOtpFlow) {
        if (existing[0].email_verificado === 0 || existing[0].email_verificado === false) {
          const codigo = crypto.randomInt(100000, 1000000).toString();
          const expiraEm = new Date(Date.now() + 15 * 60000);

          await pool.query('UPDATE codigos_verificacao SET usado = TRUE WHERE email = ?', [emailTrimmed]);
          await pool.query('INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)', [emailTrimmed, codigo, expiraEm]);
          failedVerifyAttempts.delete(emailTrimmed);

          sendVerificationEmail(emailTrimmed, existing[0].nome || trimmedName, codigo).catch(err => {
            console.warn('[Auth-Service] Failed to send verification email:', err.message);
          });
        }
        // Uniform response to prevent account enumeration when OTP verification is required
        return res.status(200).json({
          message: 'If this email address is eligible for registration, a verification code has been sent.',
          requireVerification: true,
          email: emailTrimmed
        });
      }
      return res.status(400).json({ error: 'Unable to complete registration with the provided details.' });
    }

    const senhaHash = await bcrypt.hash(String(senha), 10);

    if (requireOtpFlow) {
      await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, papel, email_verificado, auth_provider, status_conta)
         VALUES (?, ?, ?, ?, FALSE, 'local', 'ativo')`,
        [trimmedName, emailTrimmed, senhaHash, papelFinal]
      );

      const codigo = crypto.randomInt(100000, 1000000).toString();
      const expiraEm = new Date(Date.now() + 15 * 60000);

      await pool.query('INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)', [emailTrimmed, codigo, expiraEm]);
      failedVerifyAttempts.delete(emailTrimmed);

      sendVerificationEmail(emailTrimmed, trimmedName, codigo).catch(err => {
        console.warn('[Auth-Service] Failed to send verification email:', err.message);
      });

      return res.status(201).json({
        message: 'Verification code sent to your email.',
        requireVerification: true,
        email: emailTrimmed
      });
    }

    // Standard registration flow: persist user, establish session, and send Brevo welcome email
    const [insertResult] = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel, email_verificado, auth_provider, ultimo_login, status_conta)
       VALUES (?, ?, ?, ?, TRUE, 'local', CURRENT_TIMESTAMP, 'ativo')`,
      [trimmedName, emailTrimmed, senhaHash, papelFinal]
    );

    const newUserId = insertResult.insertId;
    const { token, refreshToken } = await issueSessionTokens(
      { id: newUserId, nome: trimmedName, email: emailTrimmed, papel: papelFinal, tokenVersion: 1 },
      true
    );

    sendLog('REGISTRO_SUCESSO', req, {
      usuario_id: newUserId,
      email: emailTrimmed,
      auth_provider: 'local'
    });

    // Send Welcome Email via Brevo asynchronously so email latency/errors never invalidate registration
    sendWelcomeEmail(emailTrimmed, trimmedName)
      .then((info) => {
        console.log(`[Brevo] Welcome email sent to ${maskEmail(emailTrimmed)} (${info.transport})`);
      })
      .catch((emailErr) => {
        console.warn(`[Brevo] Welcome email could not be delivered to ${maskEmail(emailTrimmed)}:`, emailErr.message);
      });

    return res.status(201).json({
      message: 'Welcome to Between Letters! Your account has been created.',
      requireVerification: false,
      token,
      refreshToken,
      usuario: {
        id: newUserId,
        nome: trimmedName,
        email: emailTrimmed,
        papel: papelFinal,
        role: papelFinal,
        auth_provider: 'local',
        foto_url: null,
        bio: null
      }
    });
  } catch (error) {
    console.error('[REGISTER ERROR]:', error.code || error.message);
    if (isDbConnectivityError(error)) {
      return res.status(503).json({ error: 'Authentication database is temporarily unavailable. Please try again shortly.' });
    }
    res.status(500).json({ error: 'Unable to complete registration right now. Please try again shortly.' });
  }
});

// =========================================================================
// 2. OTP EMAIL VERIFICATION (/verify-code & /verify-email)
// =========================================================================
async function handleVerifyCode(req, res) {
  try {
    const { email, codigo } = req.body;
    if (!email || !codigo) {
      return res.status(400).json({ error: 'Email address and 6-digit verification code are required.' });
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const codigoTrimmed = String(codigo).trim();

    const attempts = failedVerifyAttempts.get(emailTrimmed) || 0;
    if (attempts >= 5) {
      await pool.query('UPDATE codigos_verificacao SET usado = TRUE WHERE email = ?', [emailTrimmed]);
      return res.status(429).json({
        error: 'Too many incorrect attempts. This code has been invalidated for security. Please request a new code.'
      });
    }

    const conn = await pool.getConnection();
    let verificationError = null;
    try {
      await conn.beginTransaction();
      const [codigos] = await conn.query(
        'SELECT * FROM codigos_verificacao WHERE email = ? AND codigo = ? AND usado = FALSE ORDER BY id DESC LIMIT 1 FOR UPDATE',
        [emailTrimmed, codigoTrimmed]
      );

      if (codigos.length === 0) {
        await conn.rollback();
        failedVerifyAttempts.set(emailTrimmed, attempts + 1);
        return res.status(400).json({
          error: `Invalid or already used verification code. Remaining attempts: ${Math.max(0, 5 - (attempts + 1))}`
        });
      }

      const regCodigo = codigos[0];
      if (new Date() > new Date(regCodigo.expira_em)) {
        await conn.rollback();
        verificationError = 'This verification code has expired (15-minute limit). Please request a new code.';
      } else {
        await conn.query('UPDATE codigos_verificacao SET usado = TRUE WHERE id = ?', [regCodigo.id]);
        await conn.query('UPDATE usuarios SET email_verificado = TRUE, ultimo_login = CURRENT_TIMESTAMP WHERE email = ?', [emailTrimmed]);
        await conn.commit();
      }
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    if (verificationError) {
      return res.status(400).json({ error: verificationError });
    }

    failedVerifyAttempts.delete(emailTrimmed);

    const [users] = await pool.query('SELECT id, nome, email, papel, token_version, foto_url, bio FROM usuarios WHERE email = ?', [emailTrimmed]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const usuario = users[0];
    const papelVerificado = resolveEffectiveUserRole(usuario.email, usuario.papel);
    if (papelVerificado !== usuario.papel) {
      await pool.query('UPDATE usuarios SET papel = ? WHERE id = ?', [papelVerificado, usuario.id]).catch(() => {});
    }
    const { token, refreshToken } = await issueSessionTokens(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: papelVerificado, tokenVersion: usuario.token_version || 1 },
      true
    );

    // Send Welcome Email after verification
    sendWelcomeEmail(usuario.email, usuario.nome).catch(err => {
      console.warn('[Brevo] Welcome email could not be delivered after OTP:', err.message);
    });

    return res.json({
      message: 'Email verified successfully!',
      token,
      refreshToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: papelVerificado,
        role: papelVerificado,
        foto_url: usuario.foto_url || null,
        bio: usuario.bio || null
      }
    });
  } catch (error) {
    console.error('[VERIFY-CODE ERROR]:', error);
    res.status(500).json({ error: 'Internal error while verifying code.' });
  }
}

const verifyCodeRateLimiter = rateLimit(10 * 60 * 1000, 8, 'Too many verification attempts. Please wait 10 minutes.', { bucket: 'verify-code', includeEmail: true });
app.post('/verify-code', verifyCodeRateLimiter, handleVerifyCode);
app.post('/verify-email', verifyCodeRateLimiter, handleVerifyCode);

// Resend verification code (non-enumerating response)
async function handleResendCode(req, res) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email address is required.' });

    const emailTrimmed = String(email).trim().toLowerCase();
    const genericMsg = 'If an unverified account exists for this email address, a new verification code has been sent.';
    const [users] = await pool.query('SELECT id, nome, email_verificado FROM usuarios WHERE email = ?', [emailTrimmed]);

    if (users.length === 0 || users[0].email_verificado === 1 || users[0].email_verificado === true) {
      return res.json({ message: genericMsg });
    }

    await pool.query('UPDATE codigos_verificacao SET usado = TRUE WHERE email = ?', [emailTrimmed]);

    const codigo = crypto.randomInt(100000, 1000000).toString();
    const expiraEm = new Date(Date.now() + 15 * 60000);

    await pool.query('INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)', [emailTrimmed, codigo, expiraEm]);
    failedVerifyAttempts.delete(emailTrimmed);

    await sendVerificationEmail(emailTrimmed, users[0].nome, codigo);

    return res.json({ message: genericMsg });
  } catch (error) {
    console.error('[RESEND-CODE ERROR]:', error);
    res.status(500).json({ error: 'Unable to resend verification code right now. Please try again shortly.' });
  }
}

const resendCodeRateLimiter = rateLimit(15 * 60 * 1000, 5, 'Too many verification code requests. Please wait 15 minutes.', { bucket: 'resend-code', includeEmail: true });
app.post('/resend-code', resendCodeRateLimiter, handleResendCode);
app.post('/resend-verification', resendCodeRateLimiter, handleResendCode);

// =========================================================================
// 3. USER LOGIN (/login)
// =========================================================================
app.post('/login', rateLimit(15 * 60 * 1000, 12, 'Too many consecutive sign-in attempts. Please wait 15 minutes.', { bucket: 'login', includeEmail: true }), async (req, res) => {
  try {
    const { email, senha, rememberMe } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email address and password are required.' });
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [emailTrimmed]);
    if (users.length === 0) {
      sendLog('LOGIN_FALHA', req, { email: emailTrimmed, motivo: 'User not found' });
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const usuario = users[0];
    const senhaValida = await bcrypt.compare(String(senha), usuario.senha_hash);
    if (!senhaValida) {
      sendLog('LOGIN_FALHA', req, { email: emailTrimmed, usuario_id: usuario.id, motivo: 'Incorrect password' });
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const requireOtpFlow = String(process.env.REQUIRE_EMAIL_VERIFICATION || '').toLowerCase() === 'true';

    if (requireOtpFlow && (usuario.email_verificado === 0 || usuario.email_verificado === false)) {
      sendLog('BLOQUEIO_EMAIL_NAO_VERIFICADO_403', req, { email: usuario.email, usuario_id: usuario.id });
      return res.status(403).json({
        error: 'Your email address has not been confirmed yet. Please enter the 6-digit verification code sent to your inbox.',
        requireVerification: true,
        email: usuario.email
      });
    } else if (!requireOtpFlow && (usuario.email_verificado === 0 || usuario.email_verificado === false)) {
      // Auto-verify legacy unverified accounts when email verification requirement is turned off
      await pool.query('UPDATE usuarios SET email_verificado = TRUE WHERE id = ?', [usuario.id]).catch(() => {});
      usuario.email_verificado = 1;
    }

    await pool.query('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?', [usuario.id]).catch(() => {});

    const papelFinal = resolveEffectiveUserRole(usuario.email, usuario.papel);
    if (papelFinal !== usuario.papel) {
      await pool.query('UPDATE usuarios SET papel = ? WHERE id = ?', [papelFinal, usuario.id]).catch(() => {});
    }
    const { token, refreshToken } = await issueSessionTokens(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: papelFinal, tokenVersion: usuario.token_version || 1 },
      Boolean(rememberMe)
    );

    sendLog('LOGIN_SUCESSO', req, {
      usuario_id: usuario.id,
      email: usuario.email,
      papel: papelFinal
    });

    res.json({
      message: 'Signed in successfully!',
      token,
      refreshToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: papelFinal,
        role: papelFinal,
        auth_provider: usuario.auth_provider || 'local',
        foto_url: usuario.foto_url || null,
        bio: usuario.bio || null
      }
    });
  } catch (error) {
    console.error('[LOGIN ERROR]:', error.code || error.message);
    if (isDbConnectivityError(error)) {
      return res.status(503).json({ error: 'Authentication database is temporarily unavailable. Please try again shortly.' });
    }
    res.status(500).json({ error: 'Internal server error during sign in.' });
  }
});

// =========================================================================
// 4. GOOGLE OAUTH 2.0 ACCOUNT CREATION & LINKING (/oauth/google)
// =========================================================================
app.post('/oauth/google', async (req, res) => {
  try {
    const providedSecret = String(req.headers['x-internal-auth-secret'] || '');
    const expectedBuf = Buffer.from(INTERNAL_AUTH_SECRET, 'utf8');
    const providedBuf = Buffer.from(providedSecret, 'utf8');
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return res.status(403).json({ error: 'Forbidden: internal OAuth endpoint requires service authentication.' });
    }

    const { googleId, email, nome, fotoUrl, emailVerified } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: 'Verified Google account details are required.' });
    }

    if (emailVerified !== true) {
      return res.status(403).json({ error: 'Your Google email address must be verified to sign in.' });
    }

    const emailTrimmed = String(email).trim().toLowerCase();
    const displayName = (nome && String(nome).trim()) || emailTrimmed.split('@')[0];

    // Check by google_id or email to support seamless account linking without duplicates
    const [existingUsers] = await pool.query(
      'SELECT * FROM usuarios WHERE google_id = ? OR email = ? LIMIT 1',
      [String(googleId), emailTrimmed]
    );

    let usuario = null;
    let isNewUser = false;

    if (existingUsers.length > 0) {
      usuario = existingUsers[0];
      if (usuario.google_id && String(usuario.google_id) !== String(googleId)) {
        return res.status(409).json({ error: 'This email is already linked to a different Google account.' });
      }
      const updatedFoto = usuario.foto_url || fotoUrl || null;
      // SEC-01: Whenever an existing local account has no linked google_id yet, perform an atomic account claim:
      // rotate password hash, increment token_version, and revoke all existing refresh sessions so a pre-registered
      // attacker password/JWT can never persist after Google identity verification.
      const isFirstTimeGoogleClaim = !usuario.google_id;
      if (isFirstTimeGoogleClaim) {
        const rotatedHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await conn.query(
            `UPDATE usuarios
             SET google_id = ?,
                 foto_url = ?,
                 senha_hash = ?,
                 auth_provider = 'google',
                 email_verificado = TRUE,
                 token_version = COALESCE(token_version, 1) + 1,
                 ultimo_login = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [String(googleId), updatedFoto, rotatedHash, usuario.id]
          );
          await conn.query(
            `UPDATE refresh_tokens SET revogado = TRUE WHERE usuario_id = ?`,
            [usuario.id]
          );
          await conn.commit();
        } catch (claimErr) {
          await conn.rollback();
          throw claimErr;
        } finally {
          conn.release();
        }
        usuario.token_version = (usuario.token_version || 1) + 1;
        usuario.auth_provider = 'google';
      } else {
        await pool.query(
          `UPDATE usuarios
           SET foto_url = ?,
               email_verificado = TRUE,
               ultimo_login = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [updatedFoto, usuario.id]
        );
      }
      usuario.google_id = usuario.google_id || String(googleId);
      usuario.foto_url = updatedFoto;
      usuario.email_verificado = true;
    } else {
      // Create new verified user for first-time Google authentication
      isNewUser = true;
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const senhaHash = await bcrypt.hash(randomSecret, 10);
      const papelFinal = isAuthorizedAdminEmail(emailTrimmed) ? 'admin' : 'usuario';

      const [insertResult] = await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, papel, email_verificado, foto_url, auth_provider, google_id, ultimo_login, status_conta)
         VALUES (?, ?, ?, ?, TRUE, ?, 'google', ?, CURRENT_TIMESTAMP, 'ativo')`,
        [displayName.slice(0, 100), emailTrimmed, senhaHash, papelFinal, fotoUrl || null, String(googleId)]
      );

      usuario = {
        id: insertResult.insertId,
        nome: displayName.slice(0, 100),
        email: emailTrimmed,
        papel: papelFinal,
        token_version: 1,
        foto_url: fotoUrl || null,
        bio: null,
        auth_provider: 'google',
        google_id: String(googleId)
      };

      // Send Welcome Email via Brevo asynchronously for new Google users
      sendWelcomeEmail(emailTrimmed, usuario.nome)
        .then((info) => {
          console.log(`[Brevo] Welcome email sent to new Google user ${maskEmail(emailTrimmed)} (${info.transport})`);
        })
        .catch((err) => {
          console.warn(`[Brevo] Welcome email could not be delivered to ${maskEmail(emailTrimmed)}:`, err.message);
        });
    }

    const papelFinal = resolveEffectiveUserRole(usuario.email, usuario.papel);
    if (papelFinal !== usuario.papel) {
      await pool.query('UPDATE usuarios SET papel = ? WHERE id = ?', [papelFinal, usuario.id]).catch(() => {});
    }
    const { token, refreshToken } = await issueSessionTokens(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: papelFinal, tokenVersion: usuario.token_version || 1 },
      true
    );

    sendLog(isNewUser ? 'REGISTRO_GOOGLE_SUCESSO' : 'LOGIN_GOOGLE_SUCESSO', req, {
      usuario_id: usuario.id,
      email: usuario.email,
      isNewUser
    });

    return res.status(isNewUser ? 201 : 200).json({
      message: isNewUser ? 'Welcome to Between Letters!' : 'Signed in with Google.',
      isNewUser,
      token,
      refreshToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: papelFinal,
        role: papelFinal,
        auth_provider: usuario.auth_provider || 'google',
        foto_url: usuario.foto_url || null,
        bio: usuario.bio || null
      }
    });
  } catch (error) {
    console.error('[GOOGLE OAUTH ERROR]:', error);
    return res.status(500).json({ error: 'Failed to authenticate with Google.' });
  }
});

// =========================================================================
// 5. SESSION & PROFILE (/me)
// =========================================================================
app.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, nome, email, papel, foto_url, bio, auth_provider, onboarding_concluido, ultimo_login, criado_em FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
    const usuario = users[0];
    const papelFinal = resolveEffectiveUserRole(usuario.email, usuario.papel);
    if (papelFinal !== usuario.papel) {
      await pool.query('UPDATE usuarios SET papel = ? WHERE id = ?', [papelFinal, usuario.id]).catch(() => {});
    }
    res.json({
      usuario: {
        ...usuario,
        papel: papelFinal,
        role: papelFinal,
        foto_url: usuario.foto_url || null,
        bio: usuario.bio || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// =========================================================================
// 6. RBAC ADMIN ENDPOINTS (/users)
// =========================================================================
app.get('/users', authMiddleware, async (req, res) => {
  try {
    const [currentUser] = await pool.query('SELECT email, papel FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (
      currentUser.length === 0 ||
      !isAuthorizedAdminEmail(currentUser[0].email) ||
      resolveEffectiveUserRole(currentUser[0].email, currentUser[0].papel) !== 'admin'
    ) {
      sendLog('BLOQUEIO_RBAC_ADMIN_403', req, { rota: '/users', papelAtual: currentUser[0]?.papel });
      return res.status(403).json({ error: 'Access forbidden (403). Only the authorized administrator may list users.' });
    }

    const [users] = await pool.query('SELECT id, nome, email, papel, criado_em FROM usuarios ORDER BY criado_em DESC LIMIT 20');
    res.json({ usuarios: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal error while listing users.' });
  }
});

app.patch('/users/:id/role', authMiddleware, async (req, res) => {
  try {
    const [currentUser] = await pool.query('SELECT email, papel FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (
      currentUser.length === 0 ||
      !isAuthorizedAdminEmail(currentUser[0].email) ||
      resolveEffectiveUserRole(currentUser[0].email, currentUser[0].papel) !== 'admin'
    ) {
      sendLog('BLOQUEIO_RBAC_ADMIN_403', req, { rota: `/users/${req.params.id}/role`, papelAtual: currentUser[0]?.papel });
      return res.status(403).json({ error: 'Access forbidden (403). Only the authorized administrator may change user roles.' });
    }

    const targetId = req.params.id;
    const { papel } = req.body;
    const papeisValidos = ['usuario', 'premium', 'admin'];

    if (Number(req.usuarioId) === Number(targetId) && papel !== 'admin') {
      return res.status(400).json({ error: 'For security reasons, you cannot revoke your own administrator role.' });
    }

    if (!papeisValidos.includes(papel)) {
      return res.status(400).json({ error: `Invalid role. Valid options: ${papeisValidos.join(', ')}` });
    }

    if (papel === 'admin' && Number(req.usuarioId) !== Number(targetId)) {
      return res.status(403).json({ error: 'Administrative privileges are restricted exclusively to the primary administrator account.' });
    }

    const [result] = await pool.query('UPDATE usuarios SET papel = ? WHERE id = ?', [papel, targetId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    sendLog('ALTERAR_PAPEL_USUARIO', req, { targetId, novoPapel: papel });

    res.json({ message: `Role for user ${targetId} updated to "${papel}".` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal error while updating user role.' });
  }
});

app.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    const [currentUser] = await pool.query('SELECT email, papel FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (
      currentUser.length === 0 ||
      !isAuthorizedAdminEmail(currentUser[0].email) ||
      resolveEffectiveUserRole(currentUser[0].email, currentUser[0].papel) !== 'admin'
    ) {
      sendLog('BLOQUEIO_RBAC_ADMIN_403', req, { rota: `/users/${req.params.id}`, papelAtual: currentUser[0]?.papel });
      return res.status(403).json({ error: 'Access forbidden (403). Only the authorized administrator may delete users.' });
    }

    const targetId = req.params.id;
    const [targetUsers] = await pool.query('SELECT id, nome, email, papel FROM usuarios WHERE id = ?', [targetId]);
    if (targetUsers.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const targetUser = targetUsers[0];
    if (targetUser.email) {
      await pool.query('DELETE FROM codigos_verificacao WHERE email = ?', [targetUser.email]).catch(() => {});
    }
    await pool.query('DELETE FROM reset_tokens WHERE usuario_id = ?', [targetId]).catch(() => {});
    if (false) {
    }

    const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [targetId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    sendLog('EXCLUIR_USUARIO', req, { targetId, targetEmail: targetUser.email, targetNome: targetUser.nome });

    res.json({
      message: `User "${targetUser.nome}" (${targetUser.email}) with role [${targetUser.papel}] was deleted.`
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal error while deleting user.' });
  }
});

// =========================================================================
// 7. PASSWORD RECOVERY & RESET (/forgot-password, /validate-reset-token, /reset-password)
// =========================================================================
const GENERIC_RECOVERY_MESSAGE = "If an account is associated with that email address, we've sent a link to create a new password.";

app.post('/forgot-password', rateLimit(15 * 60 * 1000, 5, 'Too many password recovery requests. Please wait a few minutes.'), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please provide your email address.' });
    }

    const emailTrimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const [users] = await pool.query('SELECT id, nome, email FROM usuarios WHERE email = ?', [emailTrimmed]);
    if (users.length === 0) {
      // Prevent account enumeration by returning the exact same response
      return res.json({ message: GENERIC_RECOVERY_MESSAGE });
    }

    const usuario = users[0];

    // Invalidate any previous unused recovery tokens for this user
    await pool.query('UPDATE reset_tokens SET usado = TRUE WHERE usuario_id = ? AND usado = FALSE', [usuario.id]);

    // Generate cryptographically secure 32-byte token and store ONLY its SHA-256 hash in the database
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashRecoveryToken(rawToken);
    const expiraEm = new Date(Date.now() + 30 * 60000); // 30 minutes

    await pool.query(
      'INSERT INTO reset_tokens (token, usuario_id, expira_em, usado) VALUES (?, ?, ?, FALSE)',
      [tokenHash, usuario.id, expiraEm]
    );

    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetLink = `${appUrl}/login?mode=reset&token=${rawToken}`;

    sendPasswordRecoveryEmail(usuario.email, usuario.nome, resetLink)
      .then((info) => {
        console.log(`[Brevo] Password recovery email sent to ${usuario.email} (${info.transport})`);
      })
      .catch((emailErr) => {
        console.warn(`[Brevo] Could not send password recovery email to ${usuario.email}:`, emailErr.message);
      });

    sendLog('SOLICITAR_RECUPERACAO_SENHA', req, { usuario_id: usuario.id, email: usuario.email });

    return res.json({ message: GENERIC_RECOVERY_MESSAGE });
  } catch (error) {
    console.error('[FORGOT-PASSWORD ERROR]:', error);
    res.status(500).json({ error: 'Unable to process password recovery request at this moment.' });
  }
});

// Validate a recovery token before showing the reset form
app.get('/validate-reset-token', rateLimit(15 * 60 * 1000, 15, 'Too many recovery token checks. Please wait a few minutes.', { bucket: 'validate-reset-token' }), async (req, res) => {
  try {
    const rawToken = req.query.token ? String(req.query.token).trim() : '';
    if (!rawToken) {
      return res.status(400).json({ valid: false, error: 'Recovery token is missing.' });
    }

    const tokenHash = hashRecoveryToken(rawToken);
    const [tokens] = await pool.query(
      'SELECT usuario_id, expira_em, usado FROM reset_tokens WHERE token = ? LIMIT 1',
      [tokenHash]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ valid: false, error: 'This password recovery link is invalid.' });
    }

    const resetRequest = tokens[0];
    if (resetRequest.usado) {
      return res.status(400).json({ valid: false, error: 'This password recovery link has already been used.' });
    }

    if (new Date() > new Date(resetRequest.expira_em)) {
      return res.status(400).json({ valid: false, error: 'This password recovery link has expired. Please request a new one.' });
    }

    return res.json({ valid: true });
  } catch (error) {
    console.error('[VALIDATE-RESET-TOKEN ERROR]:', error);
    return res.status(500).json({ valid: false, error: 'Unable to validate recovery token.' });
  }
});

app.post('/reset-password', rateLimit(15 * 60 * 1000, 8, 'Too many password reset attempts. Please wait a few minutes.', { bucket: 'reset-password' }), async (req, res) => {
  try {
    const { token, novaSenha } = req.body;
    const pwErr = validatePasswordPolicy(String(novaSenha || ''));
    if (!token || pwErr) {
      return res.status(400).json({ error: pwErr || 'A valid recovery token and new password are required.' });
    }

    const rawToken = String(token).trim();
    const tokenHash = hashRecoveryToken(rawToken);
    const senhaHash = await bcrypt.hash(String(novaSenha), 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [tokens] = await conn.query(
        'SELECT * FROM reset_tokens WHERE token = ? LIMIT 1 FOR UPDATE',
        [tokenHash]
      );
      if (tokens.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'This password recovery link is invalid.' });
      }

      const resetRequest = tokens[0];
      if (resetRequest.usado) {
        await conn.rollback();
        return res.status(400).json({ error: 'This password recovery link has already been used.' });
      }
      if (new Date() > new Date(resetRequest.expira_em)) {
        await conn.rollback();
        return res.status(400).json({ error: 'This password recovery link has expired. Please request a new one.' });
      }

      await conn.query(
        'UPDATE usuarios SET senha_hash = ?, email_verificado = TRUE, token_version = COALESCE(token_version, 1) + 1 WHERE id = ?',
        [senhaHash, resetRequest.usuario_id]
      );
      await conn.query(
        'UPDATE reset_tokens SET usado = TRUE WHERE usuario_id = ?',
        [resetRequest.usuario_id]
      );
      await conn.query(
        'UPDATE refresh_tokens SET revogado = TRUE WHERE usuario_id = ?',
        [resetRequest.usuario_id]
      );
      await conn.commit();

      sendLog('REDEFINIR_SENHA_SUCESSO', req, { usuario_id: resetRequest.usuario_id });

      return res.json({ message: 'Your password has been updated. You may now sign in with your new password.' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[RESET-PASSWORD ERROR]:', error);
    res.status(500).json({ error: 'Internal error while resetting password.' });
  }
});

// =========================================================================
// REFRESH TOKEN ROTATION & REUSE DETECTION (/refresh)
// =========================================================================
app.post('/refresh', rateLimit(15 * 60 * 1000, 30, 'Too many session refresh attempts. Please sign in again.', { bucket: 'refresh' }), async (req, res) => {
  try {
    const providedSecret = String(req.headers['x-internal-auth-secret'] || '');
    const expectedBuf = Buffer.from(INTERNAL_AUTH_SECRET, 'utf8');
    const providedBuf = Buffer.from(providedSecret, 'utf8');
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return res.status(403).json({ error: 'Forbidden: internal refresh authentication required.' });
    }

    const rawRefresh = req.body && typeof req.body.refreshToken === 'string' ? req.body.refreshToken.trim() : '';
    if (!rawRefresh || rawRefresh.length < 32) {
      return res.status(401).json({ error: 'Refresh token not provided.' });
    }

    const refreshHash = hashTokenValue(rawRefresh);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(
        'SELECT * FROM refresh_tokens WHERE token_hash = ? LIMIT 1 FOR UPDATE',
        [refreshHash]
      );
      if (rows.length === 0) {
        await conn.rollback();
        return res.status(401).json({ error: 'Invalid refresh session. Please sign in again.' });
      }

      const rt = rows[0];
      if (rt.revogado) {
        await conn.rollback();
        return res.status(401).json({ error: 'Session has been revoked. Please sign in again.' });
      }

      // Reuse detection: an already-rotated token was replayed! Revoke entire family and bump token_version.
      if (rt.usado) {
        await conn.query('UPDATE refresh_tokens SET revogado = TRUE WHERE family_id = ?', [rt.family_id]);
        await conn.query('UPDATE usuarios SET token_version = COALESCE(token_version, 1) + 1 WHERE id = ?', [rt.usuario_id]);
        await conn.commit();
        sendLog('REFRESH_TOKEN_REUSE_DETECTED', req, { usuario_id: rt.usuario_id, family_id: rt.family_id });
        return res.status(401).json({ error: 'Session security violation detected. All sessions have been revoked.' });
      }

      if (new Date() > new Date(rt.expira_em)) {
        await conn.query('UPDATE refresh_tokens SET revogado = TRUE WHERE id = ?', [rt.id]);
        await conn.commit();
        return res.status(401).json({ error: 'Session expired. Please sign in again.' });
      }

      const [users] = await conn.query(
        'SELECT id, nome, email, papel, token_version, foto_url, bio, auth_provider FROM usuarios WHERE id = ? LIMIT 1',
        [rt.usuario_id]
      );
      if (users.length === 0) {
        await conn.query('UPDATE refresh_tokens SET revogado = TRUE WHERE family_id = ?', [rt.family_id]);
        await conn.commit();
        return res.status(401).json({ error: 'User account not found.' });
      }

      const usuario = users[0];
      const papelFinal = resolveEffectiveUserRole(usuario.email, usuario.papel);
      await conn.query('UPDATE refresh_tokens SET usado = TRUE WHERE id = ?', [rt.id]);

      const issued = await issueSessionTokens(
        { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: papelFinal, tokenVersion: usuario.token_version || 1 },
        Boolean(rt.remember_me),
        rt.family_id,
        conn
      );

      await conn.commit();
      return res.json({
        token: issued.token,
        refreshToken: issued.refreshToken,
        rememberMe: issued.rememberMe,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          papel: papelFinal,
          role: papelFinal,
          auth_provider: usuario.auth_provider || 'local',
          foto_url: usuario.foto_url || null,
          bio: usuario.bio || null
        }
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[REFRESH ERROR]:', error.message);
    return res.status(500).json({ error: 'Unable to refresh session.' });
  }
});

app.post('/logout', rateLimit(15 * 60 * 1000, 30, 'Too many logout requests.', { bucket: 'logout' }), async (req, res) => {
  try {
    const tokenSet = new Set();
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const t = authHeader.slice(7).trim();
      if (t) tokenSet.add(t);
    }
    if (req.body && typeof req.body.token === 'string' && req.body.token.trim()) {
      tokenSet.add(req.body.token.trim());
    }
    if (req.body && Array.isArray(req.body.tokens)) {
      for (const t of req.body.tokens) {
        if (typeof t === 'string' && t.trim()) tokenSet.add(t.trim());
      }
    }

    let lastUserId = null;
    for (const token of tokenSet) {
      let decoded = null;
      try {
        decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
      } catch {
        continue;
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expDate =
        decoded && decoded.exp
          ? new Date(decoded.exp * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const userId = decoded && decoded.id ? Number(decoded.id) : null;
      if (userId) lastUserId = userId;

      await pool.query(
        `INSERT IGNORE INTO revoked_tokens (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)`,
        [tokenHash, userId, expDate]
      );
    }

    const rawRefresh = req.body && typeof req.body.refreshToken === 'string' ? req.body.refreshToken.trim() : '';
    if (rawRefresh) {
      const rtHash = hashTokenValue(rawRefresh);
      const [rtRows] = await pool.query('SELECT family_id, usuario_id FROM refresh_tokens WHERE token_hash = ? LIMIT 1', [rtHash]);
      if (rtRows.length > 0) {
        await pool.query('UPDATE refresh_tokens SET revogado = TRUE WHERE family_id = ?', [rtRows[0].family_id]);
        if (!lastUserId && rtRows[0].usuario_id) lastUserId = rtRows[0].usuario_id;
      }
    } else if (lastUserId) {
      await pool.query('UPDATE refresh_tokens SET revogado = TRUE WHERE usuario_id = ?', [lastUserId]).catch(() => {});
    }

    if (tokenSet.size > 0 || rawRefresh) {
      await pool.query(`DELETE FROM revoked_tokens WHERE expira_em < NOW()`);
      sendLog('LOGOUT', req, { usuario_id: lastUserId || 'anonimo', motivo: req.body?.motivo || 'user_action' });
    }

    return res.json({ message: 'Session invalidated.' });
  } catch (err) {
    console.error('[Auth-Service /logout ERROR]:', err.message);
    return res.status(500).json({ error: 'Unable to invalidate server session.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Auth-service running on port ${PORT}`);
});
