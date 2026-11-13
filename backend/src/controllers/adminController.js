const { pool } = require('../config/database');
const { sendLog } = require('../services/logClient');

const PRO_MONTHLY_PRICE_BRL = Number(process.env.PRO_MONTHLY_PRICE_BRL || 14.90);
const MAX_USERS_PAGE_SIZE = 20;

function mapRoleToPlan(papel) {
  if (papel === 'admin') return 'Admin';
  if (papel === 'premium') return 'Pro';
  return 'Free';
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, '\\$&');
}

/**
 * GET /api/admin/metrics
 * Protected by authMiddleware + requireAdmin.
 * Returns aggregated user counts by plan/role, active/trialing subscriptions,
 * and an estimated test MRR figure (explicitly flagged as an estimate).
 */
async function getMetrics(req, res) {
  try {
    const [userRows] = await pool.query(`
      SELECT
        SUM(CASE WHEN papel = 'usuario' THEN 1 ELSE 0 END) AS freeCount,
        SUM(CASE WHEN papel = 'premium' THEN 1 ELSE 0 END) AS proCount,
        SUM(CASE WHEN papel = 'admin' THEN 1 ELSE 0 END) AS adminCount,
        COUNT(*) AS totalCount
      FROM usuarios
    `);

    const u = userRows[0] || {};
    const free = Number(u.freeCount || 0);
    const pro = Number(u.proCount || 0);
    const admin = Number(u.adminCount || 0);
    const totalUsers = Number(u.totalCount || 0);

    const [subRows] = await pool.query(`
      SELECT
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeCount,
        SUM(CASE WHEN status = 'trialing' THEN 1 ELSE 0 END) AS trialingCount
      FROM stripe_subscriptions
    `);

    const s = subRows[0] || {};
    const active = Number(s.activeCount || 0);
    const trialing = Number(s.trialingCount || 0);
    const totalActive = active + trialing;
    const estimatedTestMrr = Number((totalActive * PRO_MONTHLY_PRICE_BRL).toFixed(2));

    sendLog('ADMIN_METRICS_VIEWED', req, { usuario_id: req.usuarioId });

    return res.json({
      users: {
        free,
        pro,
        admin,
        total: totalUsers,
      },
      subscriptions: {
        active,
        trialing,
        totalActive,
      },
      mrr: {
        estimatedTestMrr,
        monthlyPrice: PRO_MONTHLY_PRICE_BRL,
        currency: 'BRL',
        isEstimate: true,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[adminController] getMetrics error:', error.message);
    return res.status(500).json({ error: 'Unable to load administrative metrics.' });
  }
}

/**
 * GET /api/admin/users
 * Protected by authMiddleware + requireAdmin + noStoreHeaders.
 * Enforces strict backend pagination with a hard maximum of 20 users per page.
 * Uses explicit safe field selection — never returns hashes, tokens, or private content.
 */
async function listUsers(req, res) {
  try {
    const rawLimit = Number.parseInt(String(req.query.limit ?? String(MAX_USERS_PAGE_SIZE)), 10);
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(rawLimit, MAX_USERS_PAGE_SIZE)
      : MAX_USERS_PAGE_SIZE;

    const rawCursor = req.query.cursor !== undefined ? Number.parseInt(String(req.query.cursor), 10) : null;
    const hasValidCursor = rawCursor !== null && Number.isFinite(rawCursor) && rawCursor > 0;
    const direction = String(req.query.direction || 'next').toLowerCase() === 'prev' ? 'prev' : 'next';

    const rawPage = Number.parseInt(String(req.query.page ?? '1'), 10);
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
    const useOffsetFallback = !hasValidCursor && page > 1;

    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const hasSearch = rawQuery.length > 0;
    const searchParam = hasSearch ? `%${escapeLike(rawQuery)}%` : null;

    const whereParts = [];
    const countParams = [];
    if (hasSearch) {
      whereParts.push("(u.nome LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\')");
      countParams.push(searchParam, searchParam);
    }

    const countWhere = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM usuarios u ${countWhere}`,
      countParams
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const dataWhereParts = [...whereParts];
    const dataParams = [...countParams];
    let orderBySql = 'ORDER BY u.id DESC';
    let limitSql = 'LIMIT ?';

    if (hasValidCursor) {
      if (direction === 'prev') {
        dataWhereParts.push('u.id > ?');
        dataParams.push(rawCursor);
        orderBySql = 'ORDER BY u.id ASC';
      } else {
        dataWhereParts.push('u.id < ?');
        dataParams.push(rawCursor);
        orderBySql = 'ORDER BY u.id DESC';
      }
      dataParams.push(limit + 1);
    } else if (useOffsetFallback) {
      const offset = (page - 1) * limit;
      limitSql = 'LIMIT ? OFFSET ?';
      dataParams.push(limit + 1, offset);
    } else {
      dataParams.push(limit + 1);
    }

    const dataWhere = dataWhereParts.length > 0 ? `WHERE ${dataWhereParts.join(' AND ')}` : '';

    const [rawRows] = await pool.query(
      `SELECT
        u.id,
        u.nome,
        u.email,
        u.papel,
        u.email_verificado,
        u.status_conta,
        u.criado_em,
        u.ultimo_login,
        (
          SELECT s.status
          FROM stripe_subscriptions s
          WHERE s.usuario_id = u.id
          ORDER BY s.atualizado_em DESC, s.criado_em DESC
          LIMIT 1
        ) AS subscription_status
      FROM usuarios u
      ${dataWhere}
      ${orderBySql}
      ${limitSql}`,
      dataParams
    );

    const hasMoreInDirection = rawRows.length > limit;
    let pageRows = hasMoreInDirection ? rawRows.slice(0, limit) : rawRows;
    if (hasValidCursor && direction === 'prev') {
      pageRows = [...pageRows].reverse();
    }

    const users = pageRows.map((row) => ({
      id: Number(row.id),
      nome: row.nome,
      email: row.email,
      papel: row.papel || 'usuario',
      plan: mapRoleToPlan(row.papel),
      subscriptionStatus: row.subscription_status || null,
      emailVerificado: Boolean(row.email_verificado),
      statusConta: row.status_conta || 'ativo',
      criadoEm: row.criado_em || null,
      ultimoLogin: row.ultimo_login || null,
    }));

    const firstId = users.length > 0 ? users[0].id : null;
    const lastId = users.length > 0 ? users[users.length - 1].id : null;

    let hasNextPage = false;
    let hasPreviousPage = false;
    if (hasValidCursor) {
      if (direction === 'prev') {
        hasPreviousPage = hasMoreInDirection;
        hasNextPage = users.length > 0;
      } else {
        hasNextPage = hasMoreInDirection;
        hasPreviousPage = true;
      }
    } else if (useOffsetFallback) {
      hasNextPage = hasMoreInDirection;
      hasPreviousPage = page > 1;
    } else {
      hasNextPage = hasMoreInDirection;
      hasPreviousPage = false;
    }

    sendLog('ADMIN_USERS_LISTED', req, {
      usuario_id: req.usuarioId,
      strategy: useOffsetFallback ? 'offset' : 'cursor',
      limit,
      hasSearch,
      resultCount: users.length,
    });

    return res.json({
      users,
      pagination: {
        strategy: useOffsetFallback ? 'offset' : 'cursor',
        page: useOffsetFallback ? page : 1,
        limit,
        maxPageSize: MAX_USERS_PAGE_SIZE,
        total,
        totalPages,
        nextCursor: hasNextPage ? lastId : null,
        prevCursor: hasPreviousPage ? firstId : null,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error('[adminController] listUsers error:', error.message);
    return res.status(500).json({ error: 'Unable to load user directory.' });
  }
}

/**
 * GET /api/admin/users/:id
 * Protected by authMiddleware + requireAdmin + noStoreHeaders.
 * Returns only safe administrative metadata for a single user.
 */
async function getUserDetail(req, res) {
  try {
    const userId = Number.parseInt(String(req.params.id || ''), 10);
    if (!Number.isFinite(userId) || userId <= 0 || String(userId) !== String(req.params.id).trim()) {
      return res.status(400).json({ error: 'Invalid user identifier.' });
    }

    const [rows] = await pool.query(
      `SELECT
        u.id,
        u.nome,
        u.email,
        u.papel,
        u.email_verificado,
        u.status_conta,
        u.auth_provider,
        u.criado_em,
        u.ultimo_login
      FROM usuarios u
      WHERE u.id = ?
      LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const row = rows[0];
    const [subRows] = await pool.query(
      `SELECT status, periodo_inicio, periodo_fim, atualizado_em
       FROM stripe_subscriptions
       WHERE usuario_id = ?
       ORDER BY atualizado_em DESC, criado_em DESC
       LIMIT 1`,
      [userId]
    );
    const sub = subRows[0] || null;

    sendLog('ADMIN_USER_VIEWED', req, {
      usuario_id: req.usuarioId,
      target_usuario_id: userId,
    });

    return res.json({
      user: {
        id: Number(row.id),
        nome: row.nome,
        email: row.email,
        papel: row.papel || 'usuario',
        plan: mapRoleToPlan(row.papel),
        emailVerificado: Boolean(row.email_verificado),
        statusConta: row.status_conta || 'ativo',
        authProvider: row.auth_provider || 'local',
        criadoEm: row.criado_em || null,
        ultimoLogin: row.ultimo_login || null,
        subscription: sub
          ? {
              status: sub.status,
              periodoInicio: sub.periodo_inicio || null,
              periodoFim: sub.periodo_fim || null,
              atualizadoEm: sub.atualizado_em || null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[adminController] getUserDetail error:', error.message);
    return res.status(500).json({ error: 'Unable to load user details.' });
  }
}

module.exports = {
  getMetrics,
  listUsers,
  getUserDetail,
  MAX_USERS_PAGE_SIZE,
};
