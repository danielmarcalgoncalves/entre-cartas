const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { sendLog, getAuditLogs } = require('../services/logClient');

const isProduction = process.env.NODE_ENV === 'production';
const PRIMARY_AUTH_URL = (process.env.AUTH_SERVICE_URL || (isProduction ? '' : 'http://auth-service:3000')).trim();
const FALLBACK_LOCAL_AUTH_URL = 'http://127.0.0.1:3001';
const INTERNAL_AUTH_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 32
  ? crypto.createHmac('sha256', process.env.JWT_SECRET.trim()).update('internal-auth-service').digest('hex')
  : '';

function enrichUserForClient(usuario) {
  if (!usuario || typeof usuario !== 'object') return usuario;
  const enriched = {
    ...usuario,
    role: usuario.papel || 'usuario',
  };
  const routeKey = (process.env.ADMIN_PANEL_ROUTE_KEY || '').trim();
  const isValidRouteKey = routeKey.length >= 32 && /^[A-Za-z0-9_-]+$/.test(routeKey);
  if (enriched.papel === 'admin' && isValidRouteKey) {
    enriched.adminPanelPath = `/control/${routeKey}`;
  } else {
    delete enriched.adminPanelPath;
  }
  return enriched;
}

function stripTokenFromAuthPayload(data) {
  if (!data || typeof data !== 'object') return data;
  const { token: _omittedToken, ...safeData } = data;
  if (safeData.usuario) {
    safeData.usuario = enrichUserForClient(safeData.usuario);
  }
  return safeData;
}

async function requestAuthService(config) {
  if (!PRIMARY_AUTH_URL) {
    throw new Error('AUTH_SERVICE_URL is not configured for production.');
  }
  try {
    return await axios({
      ...config,
      url: `${PRIMARY_AUTH_URL}${config.path}`
    });
  } catch (err) {
    // Only fall back to local port 3001 in non-production development outside Docker
    if (
      !isProduction &&
      !err.response &&
      PRIMARY_AUTH_URL !== FALLBACK_LOCAL_AUTH_URL &&
      (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'EAI_AGAIN')
    ) {
      return await axios({
        ...config,
        url: `${FALLBACK_LOCAL_AUTH_URL}${config.path}`
      });
    }
    throw err;
  }
}

function isSecureConnection(req) {
  const appUrl = (process.env.APP_URL || '').toLowerCase();
  if (appUrl.startsWith('https://')) return true;
  if (req && (req.secure || req.headers['x-forwarded-proto'] === 'https')) return true;
  return false;
}

function setAuthCookie(res, token, rememberMe = false, req = null) {
  const isHttps = isSecureConnection(req);
  const cookieOpts = {
    httpOnly: true,
    secure: Boolean(isHttps),
    sameSite: 'lax',
    path: '/'
  };
  if (rememberMe) {
    cookieOpts.maxAge = 30 * 24 * 60 * 60 * 1000;
  }
  res.cookie('access_token', token, cookieOpts);
}

function clearAuthCookie(res, req = null) {
  const isHttps = isSecureConnection(req);
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: Boolean(isHttps),
    sameSite: 'lax',
    path: '/'
  });
}

function getBearerToken(req) {
  if (req.token) return req.token;
  if (req.cookies && req.cookies.access_token) return req.cookies.access_token;
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
  }
  return null;
}

function getAllAuthTokens(req) {
  const tokens = new Set();
  if (req.token && typeof req.token === 'string') tokens.add(req.token.trim());
  if (req.cookies && req.cookies.access_token && typeof req.cookies.access_token === 'string') {
    tokens.add(req.cookies.access_token.trim());
  }
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
      tokens.add(parts[1].trim());
    }
  }
  if (req.body && typeof req.body.token === 'string' && req.body.token.trim()) {
    tokens.add(req.body.token.trim());
  }
  return Array.from(tokens).filter(Boolean);
}

function isGoogleConfigured() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) return false;
  if (clientId.startsWith('your_') || clientId.startsWith('sua_') || clientId.includes('placeholder')) return false;
  if (clientSecret.startsWith('your_') || clientSecret.startsWith('sua_') || clientSecret.includes('placeholder')) return false;
  return true;
}

function resolveGoogleCallbackUrl(req) {
  const configured = (process.env.GOOGLE_CALLBACK_URL || '').trim();
  if (configured && !configured.includes('seu-subdominio') && !configured.includes('your-domain')) {
    return configured;
  }
  const appUrl = (process.env.APP_URL || '').trim().replace(/\/$/, '');
  if (appUrl && !appUrl.includes('seu-subdominio')) {
    return `${appUrl}/api/auth/google/callback`;
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}/api/auth/google/callback`;
}

async function register(req, res) {
  try {
    const { nome, email, senha } = req.body;
    const safePayload = {
      nome,
      email,
      senha,
      papel: 'usuario'
    };
    const response = await requestAuthService({
      method: 'POST',
      path: '/register',
      data: safePayload
    });

    if (response.data && response.data.token) {
      setAuthCookie(res, response.data.token, true, req);
    }

    return res.status(response.status).json(stripTokenFromAuthPayload(response.data));
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Unable to reach the authentication service. Please try again shortly.' });
  }
}

async function login(req, res) {
  try {
    const response = await requestAuthService({
      method: 'POST',
      path: '/login',
      data: req.body
    });

    if (response.data && response.data.token) {
      setAuthCookie(res, response.data.token, Boolean(req.body?.rememberMe), req);
      if (response.data.usuario) {
        if (!response.data.usuario.foto_url) {
          try {
            const [rows] = await pool.query('SELECT foto_url, bio FROM usuarios WHERE id = ?', [response.data.usuario.id]);
            if (rows.length > 0) {
              response.data.usuario.foto_url = rows[0].foto_url || null;
              response.data.usuario.bio = rows[0].bio || null;
            }
          } catch (e) {}
        }
      }
      sendLog('LOGIN_SUCESSO', req, {
        usuario_id: response.data.usuario?.id,
        email: req.body?.email
      });
    }
    return res.status(response.status).json(stripTokenFromAuthPayload(response.data));
  } catch (error) {
    if (error.response) {
      sendLog('LOGIN_FALHA', req, {
        email: req.body?.email,
        status: error.response.status,
        motivo: error.response.data?.error || 'Authentication failed'
      });
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Unable to reach the authentication service. Please try again shortly.' });
  }
}

async function logout(req, res) {
  const motivo = req.body?.motivo || 'user_action';
  const tokens = getAllAuthTokens(req);
  const primaryToken = tokens[0] || null;

  try {
    if (tokens.length > 0) {
      let revokedOk = false;
      try {
        await requestAuthService({
          method: 'POST',
          path: '/logout',
          data: { token: primaryToken, tokens, motivo },
          headers: primaryToken ? { Authorization: `Bearer ${primaryToken}` } : {}
        });
        revokedOk = true;
      } catch (svcErr) {
        // Fallback: revoke all presented tokens directly in MariaDB if auth-service is momentarily unreachable
        const expDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        for (const t of tokens) {
          const tokenHash = crypto.createHash('sha256').update(t).digest('hex');
          await pool.query(
            `INSERT IGNORE INTO revoked_tokens (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)`,
            [tokenHash, req.usuarioId || null, expDate]
          );
        }
        revokedOk = true;
      }

      if (!revokedOk) {
        clearAuthCookie(res, req);
        return res.status(500).json({ error: 'Unable to complete server-side session invalidation.' });
      }
    }

    sendLog('LOGOUT', req, {
      usuario_id: req.usuarioId || req.usuario?.id || 'session_ended',
      motivo
    });
    clearAuthCookie(res, req);
    return res.json({ message: 'Signed out and session invalidated successfully.' });
  } catch (err) {
    console.error('[authController] logout error:', err.message);
    clearAuthCookie(res, req);
    return res.status(500).json({ error: 'Server session invalidation failed during logout.' });
  }
}

async function me(req, res) {
  try {
    if (req.usuario) {
      return res.json({ usuario: enrichUserForClient(req.usuario) });
    }
    const token = getBearerToken(req);
    const response = await requestAuthService({
      method: 'GET',
      path: '/me',
      headers: {
        Authorization: token ? `Bearer ${token}` : req.headers.authorization
      }
    });
    if (response.data && response.data.usuario) {
      response.data.usuario.foto_url = response.data.usuario.foto_url || null;
      response.data.usuario.bio = response.data.usuario.bio || null;
      response.data.usuario = enrichUserForClient(response.data.usuario);
    }
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Unable to verify session with the authentication service.' });
  }
}

async function forgotPassword(req, res) {
  try {
    const response = await requestAuthService({
      method: 'POST',
      path: '/forgot-password',
      data: req.body
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Unable to process password recovery request.' });
  }
}

async function validateResetToken(req, res) {
  try {
    const token = req.query.token || '';
    const response = await requestAuthService({
      method: 'GET',
      path: `/validate-reset-token?token=${encodeURIComponent(String(token))}`
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ valid: false, error: 'Unable to validate recovery token.' });
  }
}

async function resetPassword(req, res) {
  try {
    const response = await requestAuthService({
      method: 'POST',
      path: '/reset-password',
      data: req.body
    });
    clearAuthCookie(res);
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Unable to reset password at this moment.' });
  }
}

/**
 * Google OAuth 2.0 Status check
 */
function googleAuthStatus(req, res) {
  return res.json({
    configured: isGoogleConfigured()
  });
}

/**
 * Step 1: Initiate Google OAuth 2.0 Flow
 */
function googleAuthRedirect(req, res) {
  if (!isGoogleConfigured()) {
    return res.redirect('/login?error=google_not_configured');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID.trim();
  const redirectUri = resolveGoogleCallbackUrl(req);
  const state = crypto.randomBytes(24).toString('hex');
  const isHttps = isSecureConnection(req);

  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: Boolean(isHttps),
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60 * 1000 // 10 minutes
  });

  sendLog('GOOGLE_OAUTH_START', req, { redirectUri });

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'online');
  authUrl.searchParams.set('prompt', 'select_account');

  return res.redirect(authUrl.toString());
}

/**
 * Step 2: Handle Google OAuth 2.0 Callback
 */
async function googleAuthCallback(req, res) {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect('/login?error=google_cancelled');
    }

    if (!code) {
      return res.redirect('/login?error=google_missing_code');
    }

    if (!isGoogleConfigured()) {
      return res.redirect('/login?error=google_not_configured');
    }

    const storedState = req.cookies ? req.cookies.oauth_state : null;
    res.clearCookie('oauth_state');

    if (!storedState || !state || storedState !== state) {
      return res.redirect('/login?error=google_state_mismatch');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET.trim();
    const redirectUri = resolveGoogleCallbackUrl(req);

    // Exchange authorization code for tokens
    const tokenParams = new URLSearchParams({
      code: String(code),
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', tokenParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const googleAccessToken = tokenRes.data?.access_token;
    if (!googleAccessToken) {
      return res.redirect('/login?error=google_token_exchange_failed');
    }

    // Fetch verified user profile from Google
    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleAccessToken}` }
    });

    const profile = profileRes.data;
    if (!profile || !profile.sub || !profile.email) {
      return res.redirect('/login?error=google_profile_incomplete');
    }

    if (profile.email_verified === false) {
      return res.redirect('/login?error=google_email_unverified');
    }

    // Authenticate or create/link user in auth-service
    const authRes = await requestAuthService({
      method: 'POST',
      path: '/oauth/google',
      headers: {
        'X-Internal-Auth-Secret': INTERNAL_AUTH_SECRET
      },
      data: {
        googleId: profile.sub,
        email: profile.email,
        nome: profile.name || profile.given_name || profile.email.split('@')[0],
        fotoUrl: profile.picture || null,
        emailVerified: Boolean(profile.email_verified)
      }
    });

    const { token, usuario } = authRes.data;
    if (!token) {
      return res.redirect('/login?error=google_session_failed');
    }

    setAuthCookie(res, token, true, req);
    sendLog('LOGIN_GOOGLE_SUCESSO', req, {
      usuario_id: usuario?.id,
      email: usuario?.email
    });

    return res.redirect('/login?oauth=success');
  } catch (error) {
    console.error('[GOOGLE CALLBACK ERROR]:', error.response?.data || error.message);
    return res.redirect('/login?error=google_auth_failed');
  }
}

async function listUsers(req, res) {
  const adminController = require('./adminController');
  return adminController.listUsers(req, res);
}

async function updateUserRole(req, res) {
  try {
    const token = getBearerToken(req);
    const response = await requestAuthService({
      method: 'PATCH',
      path: `/users/${req.params.id}/role`,
      data: req.body,
      headers: {
        Authorization: token ? `Bearer ${token}` : req.headers.authorization
      }
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Internal error contacting authentication service.' });
  }
}

async function verifyCode(req, res) {
  try {
    const response = await requestAuthService({
      method: 'POST',
      path: '/verify-code',
      data: req.body
    });
    if (response.data && response.data.token) {
      setAuthCookie(res, response.data.token, true, req);
    }
    return res.status(response.status).json(stripTokenFromAuthPayload(response.data));
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Internal error contacting authentication service.' });
  }
}

async function resendCode(req, res) {
  try {
    const response = await requestAuthService({
      method: 'POST',
      path: '/resend-code',
      data: req.body
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Internal error contacting authentication service.' });
  }
}

async function deleteUser(req, res) {
  try {
    const token = getBearerToken(req);
    const response = await requestAuthService({
      method: 'DELETE',
      path: `/users/${req.params.id}`,
      headers: {
        Authorization: token ? `Bearer ${token}` : req.headers.authorization
      }
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Internal error contacting authentication service.' });
  }
}

async function getAuditLogsController(req, res) {
  try {
    const { limit, acao, usuario_id } = req.query;
    const logs = await getAuditLogs({ limit, acao, usuario_id });
    sendLog('ADMIN_LOGS_VIEWED', req, { usuario_id: req.usuarioId });
    return res.json(logs);
  } catch (error) {
    console.error('[getAuditLogsController Error]:', error.message);
    return res.status(500).json({ error: 'Error querying audit logs.' });
  }
}

module.exports = {
  register,
  verifyCode,
  resendCode,
  login,
  logout,
  me,
  forgotPassword,
  validateResetToken,
  resetPassword,
  googleAuthStatus,
  googleAuthRedirect,
  googleAuthCallback,
  listUsers,
  updateUserRole,
  deleteUser,
  getAuditLogs: getAuditLogsController
};
