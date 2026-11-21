const { pool } = require('../config/database');

const AUTHORIZED_ADMIN_EMAIL = 'danielpgmarcal@gmail.com';
const PAST_DUE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7-day Stripe retry grace window

function isAuthorizedAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL;
}

function isLocalhostUrl(urlStr) {
  if (!urlStr) return true;
  try {
    const parsed = new URL(urlStr);
    const h = parsed.hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h.includes('seu-subdominio') || h.includes('your-domain');
  } catch {
    return true;
  }
}

/**
 * Resolves the canonical public application URL safely (SEC-04).
 * Never derives Stripe Checkout / Portal return URLs from untrusted Origin, Host,
 * X-Forwarded-Host, or CF-Visitor headers.
 * - Production: requires a valid HTTPS APP_URL (fails closed if missing or localhost).
 * - Multi-host: optionally matches req.headers.origin strictly against ALLOWED_APP_HOSTS.
 * - Development: allows http://localhost:3000 fallback.
 */
function resolvePublicAppUrl(req = null) {
  const isProd = process.env.NODE_ENV === 'production';
  const configured = (process.env.APP_URL || '').trim().replace(/\/+$/, '');

  if (configured) {
    let parsedConfigured;
    try {
      parsedConfigured = new URL(configured);
    } catch {
      throw new Error('[SECURITY] APP_URL is not a valid URL.');
    }

    if (isProd && (parsedConfigured.protocol !== 'https:' || isLocalhostUrl(configured))) {
      throw new Error('[SECURITY] APP_URL must be a valid non-localhost HTTPS URL in production.');
    }

    // Optional explicit multi-host allowlist (ALLOWED_APP_HOSTS=app.example.com,www.example.com)
    if (req && req.headers && typeof req.headers.origin === 'string' && process.env.ALLOWED_APP_HOSTS) {
      const allowedHosts = new Set(
        String(process.env.ALLOWED_APP_HOSTS)
          .split(',')
          .map((h) => h.trim().toLowerCase())
          .filter(Boolean)
      );
      try {
        const parsedOrigin = new URL(req.headers.origin);
        const validProto = isProd ? parsedOrigin.protocol === 'https:' : (parsedOrigin.protocol === 'https:' || parsedOrigin.protocol === 'http:');
        if (validProto && allowedHosts.has(parsedOrigin.host.toLowerCase())) {
          return parsedOrigin.origin.replace(/\/+$/, '');
        }
      } catch {}
    }

    return parsedConfigured.origin.replace(/\/+$/, '');
  }

  if (isProd) {
    throw new Error('[SECURITY] APP_URL must be configured in production.');
  }

  return 'http://localhost:3000';
}

/**
 * Centralized entitlement evaluator for Free / PRO / Admin accounts.
 * Ensures:
 * - Only danielpgmarcal@gmail.com holds the 'admin' role.
 * - Active or trialing subscriptions grant 'premium' (PRO).
 * - Past-due subscriptions retain PRO access during the payment retry grace window,
 *   while flagging billingWarning = true.
 * - Canceled, unpaid, or expired subscriptions do not retain PRO privileges indefinitely.
 */
async function evaluateUserEntitlement(dbOrConn, usuarioId) {
  const executor = dbOrConn || pool;
  const [userRows] = await executor.query(
    'SELECT id, nome, email, papel FROM usuarios WHERE id = ? LIMIT 1',
    [usuarioId]
  );

  if (userRows.length === 0) {
    return null;
  }

  const user = userRows[0];
  const isExclusiveAdmin = isAuthorizedAdminEmail(user.email);

  const [subRows] = await executor.query(
    `SELECT stripe_customer_id, stripe_subscription_id, status, periodo_inicio, periodo_fim, criado_em, atualizado_em
     FROM stripe_subscriptions
     WHERE usuario_id = ?
     ORDER BY atualizado_em DESC, criado_em DESC
     LIMIT 1`,
    [usuarioId]
  );
  const sub = subRows[0] || null;

  if (isExclusiveAdmin) {
    if (user.papel !== 'admin') {
      await executor.query('UPDATE usuarios SET papel = ? WHERE id = ?', ['admin', usuarioId]).catch(() => {});
    }
    return {
      usuarioId: Number(user.id),
      email: user.email,
      papel: 'admin',
      plan: 'Admin',
      isPro: true,
      isAdmin: true,
      isPastDue: sub?.status === 'past_due',
      billingWarning: sub?.status === 'past_due',
      canManageBilling: Boolean(sub?.stripe_customer_id),
      subscription: sub,
    };
  }

  let effectiveRole = user.papel === 'admin' ? 'usuario' : (user.papel || 'usuario');

  if (sub) {
    const status = String(sub.status || '').toLowerCase();
    const now = Date.now();
    const periodEndMs = sub.periodo_fim ? new Date(sub.periodo_fim).getTime() : null;

    if (status === 'active' || status === 'trialing') {
      // If period_end is not expired (or Stripe hasn't transitioned status yet), ensure premium
      if (effectiveRole !== 'premium') {
        effectiveRole = 'premium';
        await executor.query('UPDATE usuarios SET papel = ? WHERE id = ?', ['premium', usuarioId]).catch(() => {});
      }
    } else if (status === 'past_due') {
      // Past-due: preserve PRO access during grace period, revoke if grace period has elapsed
      const graceExpired =
        periodEndMs !== null && Number.isFinite(periodEndMs) && now > periodEndMs + PAST_DUE_GRACE_PERIOD_MS;
      if (graceExpired && effectiveRole === 'premium') {
        effectiveRole = 'usuario';
        await executor.query('UPDATE usuarios SET papel = ? WHERE id = ?', ['usuario', usuarioId]).catch(() => {});
      }
    } else if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired' || status === 'inactive' || status === 'paused') {
      // Canceled, unpaid, expired, or paused subscriptions must not retain PRO access
      if (effectiveRole === 'premium') {
        effectiveRole = 'usuario';
        await executor.query('UPDATE usuarios SET papel = ? WHERE id = ?', ['usuario', usuarioId]).catch(() => {});
      }
    }
  } else if (user.papel === 'admin') {
    // Non-authorized account with admin role is normalized to 'usuario'
    await executor.query('UPDATE usuarios SET papel = ? WHERE id = ?', ['usuario', usuarioId]).catch(() => {});
  }

  const isPro = effectiveRole === 'premium';
  const isPastDue = sub?.status === 'past_due';

  return {
    usuarioId: Number(user.id),
    email: user.email,
    papel: effectiveRole,
    plan: isPro ? 'Pro' : 'Free',
    isPro,
    isAdmin: false,
    isPastDue,
    billingWarning: isPastDue,
    canManageBilling: Boolean(sub?.stripe_customer_id),
    subscription: sub,
  };
}

module.exports = {
  AUTHORIZED_ADMIN_EMAIL,
  isAuthorizedAdminEmail,
  resolvePublicAppUrl,
  evaluateUserEntitlement,
};
