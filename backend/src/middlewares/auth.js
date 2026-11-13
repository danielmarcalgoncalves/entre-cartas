const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { sendLog } = require('../services/logClient');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
  throw new Error('[SECURITY] JWT_SECRET must be configured and at least 32 characters long.');
}
const JWT_SECRET = process.env.JWT_SECRET.trim();

/**
 * Middleware de Autenticação com Blindagem Anti-IDOR e Anti-Falsificação de Privilégios:
 * 1. Extrai o token de Cookie HttpOnly (access_token) ou cabeçalho Authorization: Bearer
 * 2. Valida criptograficamente a assinatura do JWT contra o segredo forte do servidor
 * 3. Consulta o MariaDB em tempo real para verificar a existência da conta
 * 4. Garante que o papel ('papel' / 'role') seja estritamente o do banco de dados, ignorando dados do cliente
 * 5. Bloqueia contas não verificadas
 */
async function authMiddleware(req, res, next) {
  let token = null;

  // 1. Prioriza Cookie HttpOnly (imune a roubo via JavaScript / XSS)
  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  } else if (req.headers['authorization']) {
    const authHeader = req.headers['authorization'];
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. Authentication token not provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        error: 'Invalid authentication token: missing user identifier.'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    try {
      const [revoked] = await pool.query(
        'SELECT 1 FROM revoked_tokens WHERE token_hash = ? LIMIT 1',
        [tokenHash]
      );
      if (revoked.length > 0) {
        return res.status(401).json({
          error: 'Session has ended or been logged out. Please sign in again.'
        });
      }
    } catch (revokeCheckErr) {
      console.error('[Auth Middleware] Failed to verify token revocation status:', revokeCheckErr.message);
      return res.status(503).json({
        error: 'Authentication service temporarily unavailable. Please try again.'
      });
    }

    // Consulta no MariaDB para validar em tempo real (Defesa Anti-IDOR e Anti-Privilege Escalation)
    const [rows] = await pool.query(
      'SELECT id, nome, email, papel, token_version, email_verificado, foto_url, bio, onboarding_concluido FROM usuarios WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid session: User account not found or revoked.'
      });
    }

    const usuarioDb = rows[0];
    if ((decoded.tv || 1) !== (usuarioDb.token_version || 1)) {
      return res.status(401).json({
        error: 'Session invalidated due to password change or security update. Please sign in again.'
      });
    }

    // Bloqueia contas se a verificação de e-mail estiver explicitamente ativada
    const requireVerification = String(process.env.REQUIRE_EMAIL_VERIFICATION || '').toLowerCase() === 'true';
    if (requireVerification && (usuarioDb.email_verificado === 0 || usuarioDb.email_verificado === false)) {
      sendLog('ACESSO_BLOQUEADO_403', req, {
        motivo: 'E-mail não verificado',
        usuario_id: usuarioDb.id,
        email: usuarioDb.email
      });
      return res.status(403).json({
        error: 'Access restricted: Your email address has not been confirmed yet. Please verify your account with the code sent to your inbox.',
        requireVerification: true,
        email: usuarioDb.email
      });
    }

    // Associa dados validados diretamente do banco de dados ao request (imutáveis)
    const papelFinal = usuarioDb.papel || 'usuario';
    req.token = token;
    req.usuarioId = Number(usuarioDb.id);
    req.usuarioPapel = papelFinal;
    req.usuario = {
      id: Number(usuarioDb.id),
      nome: usuarioDb.nome,
      email: usuarioDb.email,
      papel: papelFinal,
      role: papelFinal,
      email_verificado: !!usuarioDb.email_verificado,
      foto_url: usuarioDb.foto_url || null,
      bio: usuarioDb.bio || null,
      onboarding_concluido: usuarioDb.onboarding_concluido === 1 || usuarioDb.onboarding_concluido === true
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired authentication token. Please sign in again.'
    });
  }
}

/**
 * Middleware RBAC: Valida se o papel do usuário autenticado tem autorização para o endpoint.
 * Retorna 403 Forbidden caso o papel não seja permitido.
 * @param  {...string} papeisPermitidos - Lista de papéis autorizados (ex: 'admin', 'premium')
 */
function requireRole(...papeisPermitidos) {
  return (req, res, next) => {
    const papelUsuario = req.usuarioPapel || (req.usuario && (req.usuario.papel || req.usuario.role));
    if (!papelUsuario || !papeisPermitidos.includes(papelUsuario)) {
      console.warn(`[RBAC BLOCK] Usuário ID ${req.usuarioId} com papel "${papelUsuario}" tentou acessar rota exclusiva para [${papeisPermitidos.join(', ')}].`);
      sendLog('BLOQUEIO_RBAC_403', req, {
        motivo: 'Papel de usuário insuficiente',
        papelAtual: papelUsuario || 'desconhecido',
        papeisPermitidos
      });
      return res.status(403).json({
        error: 'Access forbidden (403 Forbidden). Your account permissions do not allow this action.',
        currentRole: papelUsuario || 'unknown',
        allowedRoles: papeisPermitidos
      });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  const role = req.usuarioPapel;
  if (!req.usuarioId || role !== 'admin') {
    sendLog('BLOQUEIO_RBAC_ADMIN_403', req, {
      motivo: 'Unauthorized access attempt to administrative resource',
      usuario_id: req.usuarioId || null,
      papelAtual: role || 'unauthenticated'
    });
    return res.status(403).json({ error: 'Access restricted to administrators only.' });
  }
  next();
}

/**
 * Middleware de Autenticação Opcional:
 * Se o token for fornecido e válido, injeta req.usuarioId e req.usuarioPapel.
 * Se não for fornecido, segue a requisição como visitante anônimo sem bloquear com 401.
 */
async function optionalAuth(req, res, next) {
  let token = null;
  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  } else if (req.headers['authorization']) {
    const authHeader = req.headers['authorization'];
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.id) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      let isRevoked = true;
      try {
        const [revoked] = await pool.query(
          'SELECT 1 FROM revoked_tokens WHERE token_hash = ? LIMIT 1',
          [tokenHash]
        );
        isRevoked = revoked.length > 0;
      } catch (e) {
        console.error('[OptionalAuth] Failed to verify token revocation status:', e.message);
        isRevoked = true;
      }

      if (!isRevoked) {
        const [rows] = await pool.query(
          'SELECT id, papel, token_version FROM usuarios WHERE id = ?',
          [decoded.id]
        );
        if (rows.length > 0 && (decoded.tv || 1) === (rows[0].token_version || 1)) {
          req.usuarioId = Number(rows[0].id);
          req.usuarioPapel = rows[0].papel || 'usuario';
        }
      }
    }
  } catch (err) {
    // Silencioso se o token for inválido em rota opcional
  }
  next();
}

const requirePremiumOrAdmin = requireRole('premium', 'admin');

module.exports = {
  authMiddleware,
  optionalAuth,
  requireRole,
  requireAdmin,
  requirePremiumOrAdmin
};

