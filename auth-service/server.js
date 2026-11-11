require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

const JWT_STRONG_FALLBACK = 'XSfvtJaid8X39mPyO3i8iHE6cCrGZZYHJ_FM7KsfXRqJhtqj9tnYkZMv2uFkuOWV_2026';
const JWT_SECRET = (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 32)
  ? process.env.JWT_SECRET.trim()
  : JWT_STRONG_FALLBACK;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
  console.warn('[SECURITY] JWT_SECRET not configured or shorter than 32 characters. Using secure 70-character fallback.');
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
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
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
      headers: { 'Content-Type': 'application/json' },
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
  queueLimit: 0
});

// Safe schema migration on startup so auth-service columns are always available
async function ensureAuthSchema() {
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

      const alterQueries = [
        `ALTER TABLE usuarios ADD COLUMN papel VARCHAR(50) DEFAULT 'usuario'`,
        `ALTER TABLE usuarios ADD COLUMN email_verificado BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE usuarios ADD COLUMN foto_url VARCHAR(500) DEFAULT NULL`,
        `ALTER TABLE usuarios ADD COLUMN bio TEXT DEFAULT NULL`,
        `ALTER TABLE usuarios ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local'`,
        `ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE usuarios ADD COLUMN ultimo_login TIMESTAMP NULL DEFAULT NULL`,
        `ALTER TABLE usuarios ADD COLUMN status_conta VARCHAR(30) DEFAULT 'ativo'`,
        `ALTER TABLE usuarios ADD COLUMN onboarding_concluido BOOLEAN DEFAULT FALSE`
      ];

      for (const q of alterQueries) {
        try {
          await conn.query(q);
        } catch (e) {
          // Column already exists
        }
      }
    } finally {
      conn.release();
    }
  } catch (err) {
    console.warn('[Auth-Service] Schema initialization deferred:', err.message);
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
    rejectUnauthorized: false
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
                  ✦ EPISTOLARY ARCHIVE ✦
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

  const bodyHtml = `
    <p style="font-size: 17px; line-height: 1.7; color: #2d2319; margin: 0 0 18px 0;">
      Dear <strong>${safeName}</strong>,
    </p>
    <p style="font-size: 16px; line-height: 1.75; color: #433526; margin: 0 0 18px 0; font-style: italic;">
      Some thoughts deserve a place to stay.
    </p>
    <p style="font-size: 15px; line-height: 1.75; color: #433526; margin: 0 0 18px 0;">
      Welcome to <strong>Between Letters</strong> — a quiet space created for your memories, reflections, letters, and stories.
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

  const textContent = `Dear ${safeName},\n\nSome thoughts deserve a place to stay.\n\nWelcome to Between Letters — a quiet space created for your memories, reflections, letters, and stories.\n\nYour personal journal is ready whenever you are.\n\nTake your time. Write freely. Keep what matters.\n\nOpen your desk: ${deskUrl}\n\nWith warmth,\nBetween Letters`;

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

  const bodyHtml = `
    <p style="font-size: 17px; line-height: 1.7; color: #2d2319; margin: 0 0 18px 0;">
      Dear <strong>${safeName}</strong>,
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

  const bodyHtml = `
    <p style="font-size: 17px; line-height: 1.7; color: #2d2319; margin: 0 0 18px 0;">
      Dear <strong>${safeName}</strong>,
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
      If you did not request this code, you may safely disregard this letter.
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

// In-memory rate limiting in auth-service
const authRateLimitMap = new Map();
function rateLimit(windowMs, maxReqs, customMsg) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection?.remoteAddress || 'ip';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
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
    next();
  };
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

    const [users] = await pool.query('SELECT id, nome, email, papel, email_verificado, foto_url, bio, auth_provider, onboarding_concluido FROM usuarios WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'User account not found or revoked.' });
    }

    const usuarioDb = users[0];
    const papelFinal = usuarioDb.papel || 'usuario';
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
    if (String(senha).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
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

    const papelFinal = 'usuario';
    const requireOtpFlow = String(process.env.REQUIRE_EMAIL_VERIFICATION || '').toLowerCase() === 'true';

    const [existing] = await pool.query('SELECT id, email_verificado FROM usuarios WHERE email = ?', [emailTrimmed]);

    if (existing.length > 0) {
      if (requireOtpFlow && (existing[0].email_verificado === 0 || existing[0].email_verificado === false)) {
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expiraEm = new Date(Date.now() + 15 * 60000);

        await pool.query('UPDATE codigos_verificacao SET usado = TRUE WHERE email = ?', [emailTrimmed]);
        await pool.query('INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)', [emailTrimmed, codigo, expiraEm]);

        sendVerificationEmail(emailTrimmed, trimmedName, codigo).catch(err => {
          console.warn('[Auth-Service] Failed to send verification email:', err.message);
        });

        return res.status(200).json({
          message: 'A pending registration was found. A new verification code has been sent to your email.',
          requireVerification: true,
          email: emailTrimmed
        });
      }
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const senhaHash = await bcrypt.hash(String(senha), 10);

    if (requireOtpFlow) {
      await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, papel, email_verificado, auth_provider, status_conta)
         VALUES (?, ?, ?, ?, FALSE, 'local', 'ativo')`,
        [trimmedName, emailTrimmed, senhaHash, papelFinal]
      );

      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      const expiraEm = new Date(Date.now() + 15 * 60000);

      await pool.query('INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)', [emailTrimmed, codigo, expiraEm]);

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
    const token = jwt.sign(
      { id: newUserId, nome: trimmedName, email: emailTrimmed, papel: papelFinal },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    sendLog('REGISTRO_SUCESSO', req, {
      usuario_id: newUserId,
      email: emailTrimmed,
      auth_provider: 'local'
    });

    // Send Welcome Email via Brevo asynchronously so email latency/errors never invalidate registration
    sendWelcomeEmail(emailTrimmed, trimmedName)
      .then((info) => {
        console.log(`[Brevo] Welcome email sent to ${emailTrimmed} (${info.transport})`);
      })
      .catch((emailErr) => {
        console.warn(`[Brevo] Welcome email could not be delivered to ${emailTrimmed}:`, emailErr.message);
      });

    return res.status(201).json({
      message: 'Welcome to Between Letters! Your account has been created.',
      requireVerification: false,
      token,
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
    console.error('[REGISTER ERROR]:', error);
    res.status(500).json({ error: `Registration error: ${error.message || 'Internal server error.'}` });
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

    const [codigos] = await pool.query(
      'SELECT * FROM codigos_verificacao WHERE email = ? AND codigo = ? AND usado = FALSE ORDER BY id DESC LIMIT 1',
      [emailTrimmed, codigoTrimmed]
    );

    if (codigos.length === 0) {
      failedVerifyAttempts.set(emailTrimmed, attempts + 1);
      return res.status(400).json({
        error: `Invalid or already used verification code. Remaining attempts: ${Math.max(0, 5 - (attempts + 1))}`
      });
    }

    failedVerifyAttempts.delete(emailTrimmed);

    const regCodigo = codigos[0];
    if (new Date() > new Date(regCodigo.expira_em)) {
      return res.status(400).json({ error: 'This verification code has expired (15-minute limit). Please request a new code.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE codigos_verificacao SET usado = TRUE WHERE id = ?', [regCodigo.id]);
      await conn.query('UPDATE usuarios SET email_verificado = TRUE, ultimo_login = CURRENT_TIMESTAMP WHERE email = ?', [emailTrimmed]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const [users] = await pool.query('SELECT id, nome, email, papel, foto_url, bio FROM usuarios WHERE email = ?', [emailTrimmed]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const usuario = users[0];
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel || 'usuario' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send Welcome Email after verification
    sendWelcomeEmail(usuario.email, usuario.nome).catch(err => {
      console.warn('[Brevo] Welcome email could not be delivered after OTP:', err.message);
    });

    return res.json({
      message: 'Email verified successfully!',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel || 'usuario',
        role: usuario.papel || 'usuario',
        foto_url: usuario.foto_url || null,
        bio: usuario.bio || null
      }
    });
  } catch (error) {
    console.error('[VERIFY-CODE ERROR]:', error);
    res.status(500).json({ error: 'Internal error while verifying code.' });
  }
}

app.post('/verify-code', rateLimit(10 * 60 * 1000, 8, 'Too many verification attempts. Please wait 10 minutes.'), handleVerifyCode);
app.post('/verify-email', rateLimit(10 * 60 * 1000, 8, 'Too many verification attempts. Please wait 10 minutes.'), handleVerifyCode);

// Resend verification code
async function handleResendCode(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required.' });

    const emailTrimmed = String(email).trim().toLowerCase();
    const [users] = await pool.query('SELECT id, nome, email_verificado FROM usuarios WHERE email = ?', [emailTrimmed]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'No account found for this email address.' });
    }

    if (users[0].email_verificado === 1 || users[0].email_verificado === true) {
      return res.status(400).json({ error: 'This email address is already verified. You may sign in.' });
    }

    await pool.query('UPDATE codigos_verificacao SET usado = TRUE WHERE email = ?', [emailTrimmed]);

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEm = new Date(Date.now() + 15 * 60000);

    await pool.query('INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)', [emailTrimmed, codigo, expiraEm]);

    await sendVerificationEmail(emailTrimmed, users[0].nome, codigo);

    return res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (error) {
    console.error('[RESEND-CODE ERROR]:', error);
    res.status(500).json({ error: `Failed to resend verification code: ${error.message || 'Internal error.'}` });
  }
}

app.post('/resend-code', handleResendCode);
app.post('/resend-verification', handleResendCode);

// =========================================================================
// 3. USER LOGIN (/login)
// =========================================================================
app.post('/login', async (req, res) => {
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

    const papelFinal = usuario.papel || 'usuario';
    const expiresIn = rememberMe ? '30d' : '7d';
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: papelFinal },
      JWT_SECRET,
      { expiresIn }
    );

    sendLog('LOGIN_SUCESSO', req, {
      usuario_id: usuario.id,
      email: usuario.email,
      papel: papelFinal
    });

    res.json({
      message: 'Signed in successfully!',
      token,
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
    console.error('[LOGIN ERROR]:', error);
    res.status(500).json({ error: 'Internal server error during sign in.' });
  }
});

// =========================================================================
// 4. GOOGLE OAUTH 2.0 ACCOUNT CREATION & LINKING (/oauth/google)
// =========================================================================
app.post('/oauth/google', async (req, res) => {
  try {
    const { googleId, email, nome, fotoUrl, emailVerified } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: 'Verified Google account details are required.' });
    }

    if (emailVerified === false) {
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
      // Link/update existing account
      usuario = existingUsers[0];
      const updatedFoto = usuario.foto_url || fotoUrl || null;
      await pool.query(
        `UPDATE usuarios
         SET google_id = COALESCE(google_id, ?),
             foto_url = ?,
             email_verificado = TRUE,
             ultimo_login = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [String(googleId), updatedFoto, usuario.id]
      );
      usuario.google_id = usuario.google_id || String(googleId);
      usuario.foto_url = updatedFoto;
      usuario.email_verificado = true;
    } else {
      // Create new verified user for first-time Google authentication
      isNewUser = true;
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const senhaHash = await bcrypt.hash(randomSecret, 10);
      const papelFinal = 'usuario';

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
        foto_url: fotoUrl || null,
        bio: null,
        auth_provider: 'google',
        google_id: String(googleId)
      };

      // Send Welcome Email via Brevo asynchronously for new Google users
      sendWelcomeEmail(emailTrimmed, usuario.nome)
        .then((info) => {
          console.log(`[Brevo] Welcome email sent to new Google user ${emailTrimmed} (${info.transport})`);
        })
        .catch((err) => {
          console.warn(`[Brevo] Welcome email could not be delivered to ${emailTrimmed}:`, err.message);
        });
    }

    const papelFinal = usuario.papel || 'usuario';
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: papelFinal },
      JWT_SECRET,
      { expiresIn: '7d' }
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
    const papelFinal = usuario.papel || 'usuario';
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
    const [currentUser] = await pool.query('SELECT papel FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (currentUser.length === 0 || currentUser[0].papel !== 'admin') {
      sendLog('BLOQUEIO_RBAC_ADMIN_403', req, { rota: '/users', papelAtual: currentUser[0]?.papel });
      return res.status(403).json({ error: 'Access forbidden (403). Only administrators may list users.' });
    }

    const [users] = await pool.query('SELECT id, nome, email, papel, criado_em FROM usuarios ORDER BY criado_em DESC');
    res.json({ usuarios: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal error while listing users.' });
  }
});

app.patch('/users/:id/role', authMiddleware, async (req, res) => {
  try {
    const [currentUser] = await pool.query('SELECT papel FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (currentUser.length === 0 || currentUser[0].papel !== 'admin') {
      sendLog('BLOQUEIO_RBAC_ADMIN_403', req, { rota: `/users/${req.params.id}/role`, papelAtual: currentUser[0]?.papel });
      return res.status(403).json({ error: 'Access forbidden (403). Only administrators may change user roles.' });
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
    const [currentUser] = await pool.query('SELECT papel FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (currentUser.length === 0 || currentUser[0].papel !== 'admin') {
      sendLog('BLOQUEIO_RBAC_ADMIN_403', req, { rota: `/users/${req.params.id}`, papelAtual: currentUser[0]?.papel });
      return res.status(403).json({ error: 'Access forbidden (403). Only administrators may delete users.' });
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
app.get('/validate-reset-token', async (req, res) => {
  try {
    const rawToken = req.query.token ? String(req.query.token).trim() : '';
    if (!rawToken) {
      return res.status(400).json({ valid: false, error: 'Recovery token is missing.' });
    }

    const tokenHash = hashRecoveryToken(rawToken);
    const [tokens] = await pool.query(
      'SELECT usuario_id, expira_em, usado FROM reset_tokens WHERE token = ? OR token = ? LIMIT 1',
      [tokenHash, rawToken]
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

app.post('/reset-password', rateLimit(15 * 60 * 1000, 8, 'Too many password reset attempts. Please wait a few minutes.'), async (req, res) => {
  try {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha || String(novaSenha).length < 6) {
      return res.status(400).json({ error: 'A valid recovery token and a new password of at least 6 characters are required.' });
    }

    const rawToken = String(token).trim();
    const tokenHash = hashRecoveryToken(rawToken);

    const [tokens] = await pool.query(
      'SELECT * FROM reset_tokens WHERE token = ? OR token = ? LIMIT 1',
      [tokenHash, rawToken]
    );
    if (tokens.length === 0) {
      return res.status(400).json({ error: 'This password recovery link is invalid.' });
    }

    const resetRequest = tokens[0];
    if (resetRequest.usado) {
      return res.status(400).json({ error: 'This password recovery link has already been used.' });
    }
    if (new Date() > new Date(resetRequest.expira_em)) {
      return res.status(400).json({ error: 'This password recovery link has expired. Please request a new one.' });
    }

    const senhaHash = await bcrypt.hash(String(novaSenha), 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'UPDATE usuarios SET senha_hash = ?, email_verificado = TRUE WHERE id = ?',
        [senhaHash, resetRequest.usuario_id]
      );
      await conn.query(
        'UPDATE reset_tokens SET usado = TRUE WHERE usuario_id = ?',
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

app.post('/logout', async (req, res) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.body && req.body.token) {
      token = String(req.body.token).trim();
    }

    if (token) {
      let decoded = null;
      try {
        decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
      } catch {}

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expDate =
        decoded && decoded.exp
          ? new Date(decoded.exp * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const userId = decoded && decoded.id ? Number(decoded.id) : null;

      await pool.query(
        `INSERT IGNORE INTO revoked_tokens (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)`,
        [tokenHash, userId, expDate]
      );
      await pool.query(`DELETE FROM revoked_tokens WHERE expira_em < NOW()`);
      sendLog('LOGOUT', req, { usuario_id: userId || 'anonimo', motivo: req.body?.motivo || 'user_action' });
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
