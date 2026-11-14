const { pool } = require('../config/database');
const { sendLog, getAuditLogs } = require('../services/logClient');
const { isAuthorizedAdminEmail } = require('../utils/entitlement');

const PRO_MONTHLY_PRICE = Number(process.env.PRO_MONTHLY_PRICE_BRL || 14.90);
const MAX_USERS_PAGE_SIZE = 20;
const MAX_LOGS_PAGE_SIZE = 100;

const SENSITIVE_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'senha',
  'senha_hash',
  'password',
  'novasenha',
  'authorization',
  'cookie',
  'secret',
  'jwt',
]);

function sanitizeMetadata(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeMetadata(item, depth + 1));
  if (typeof value === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        clean[k] = '[REDACTED]';
      } else {
        clean[k] = sanitizeMetadata(v, depth + 1);
      }
    }
    return clean;
  }
  return value;
}

function resolveUserPlan(email, papel) {
  if (isAuthorizedAdminEmail(email) && papel === 'admin') {
    return { role: 'admin', plan: 'Admin' };
  }
  if (papel === 'premium') {
    return { role: 'premium', plan: 'Pro' };
  }
  return { role: 'usuario', plan: 'Free' };
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, '\\$&');
}

function classifyLogEvent(acao = '') {
  const upper = String(acao || '').toUpperCase();
  if (upper.includes('LOGIN') || upper.includes('LOGOUT') || upper.includes('REGISTRO') || upper.includes('SENHA') || upper.includes('OAUTH')) {
    return { category: 'AUTHENTICATION', status: upper.includes('FALHA') || upper.includes('ERRO') || upper.includes('BLOQUEIO') ? 'warning' : 'success' };
  }
  if (upper.includes('STRIPE') || upper.includes('PREMIUM')) {
    return { category: 'BILLING', status: upper.includes('FALHOU') || upper.includes('ERRO') || upper.includes('REVOGADO') ? 'warning' : 'success' };
  }
  if (upper.includes('BLOQUEIO') || upper.includes('403') || upper.includes('NEGADO')) {
    return { category: 'SECURITY', status: 'warning' };
  }
  if (upper.includes('ADMIN') || upper.includes('PAPEL') || upper.includes('EXCLUIR_USUARIO')) {
    return { category: 'ADMINISTRATION', status: 'info' };
  }
  return { category: 'APPLICATION', status: 'info' };
}

function describeLogEvent(log) {
  const acao = String(log.acao || 'EVENT').toUpperCase();
  const det = typeof log.detalhes === 'object' && log.detalhes !== null ? log.detalhes : {};

  switch (acao) {
    case 'LOGIN_SUCESSO':
      return 'User signed in with email and password.';
    case 'LOGIN_GOOGLE_SUCESSO':
      return 'User signed in via Google OAuth 2.0.';
    case 'REGISTRO_SUCESSO':
    case 'REGISTRO_GOOGLE_SUCESSO':
      return 'New account registered in Between Letters.';
    case 'LOGIN_FALHA':
      return `Sign-in failed (${det.motivo || 'invalid credentials'}).`;
    case 'LOGOUT':
      return `Session signed out (${det.motivo || 'user action'}).`;
    case 'STRIPE_CHECKOUT_CRIADO':
      return `Initiated Stripe Checkout session (${det.session_id || 'subscription'}).`;
    case 'STRIPE_PREMIUM_ATIVADO':
      return `Pro Sender Club subscription activated (${det.status || 'active'}).`;
    case 'STRIPE_PAGAMENTO_FALHOU':
      return `Subscription invoice payment failed (marked as past_due).`;
    case 'STRIPE_PREMIUM_REVOGADO':
      return `Pro subscription ended or canceled (${det.motivo || 'canceled'}).`;
    case 'STRIPE_PORTAL_CRIADO':
      return 'Opened Stripe Billing Portal session.';
    case 'CARTA_ENVIADA':
      return `Created letter "${det.titulo || 'Untitled'}" (${det.categoria || 'personal'}).`;
    case 'CARTA_DESLACRADA':
      return `Opened archive letter "${det.titulo || `#${det.carta_id || ''}`}".`;
    case 'CARIMBO_APLICADO':
      return `Stamped letter "${det.titulo || `#${det.carta_id || ''}`}" as ${det.tipo_carimbo || 'READ'}.`;
    case 'CADERNO_EXCLUIDO':
      return `Deleted journal volume (${det.client_id || 'notebook'}).`;
    case 'JOURNAL_MEDIA_UPLOADED':
      return `Uploaded photograph to journal (${det.notebook_id || 'notebook'}).`;
    case 'BLOQUEIO_LIMITE_CARTAS_403':
    case 'BLOQUEIO_LIMITE_CADERNOS_403':
    case 'BLOQUEIO_LIMITE_PASTAS_403':
    case 'BLOQUEIO_LIMITE_FAVORITOS_403':
      return det.motivo || 'Reached Free plan usage quota limit.';
    case 'BLOQUEIO_RBAC_ADMIN_403':
    case 'BLOQUEIO_RBAC_403':
      return det.motivo || 'Blocked unauthorized access attempt (403 Forbidden).';
    default:
      if (det.motivo) return String(det.motivo);
      if (det.rota) return `${det.metodo || 'REQ'} ${det.rota}`;
      return acao.replace(/_/g, ' ');
  }
}

async function enrichLogsWithUserIdentities(rawLogs = []) {
  const numericUserIds = Array.from(
    new Set(
      rawLogs
        .map((l) => Number.parseInt(String(l.usuario_id || ''), 10))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );

  const userMap = new Map();
  if (numericUserIds.length > 0) {
    try {
      const placeholders = numericUserIds.map(() => '?').join(',');
      const [userRows] = await pool.query(
        `SELECT id, nome, email, papel FROM usuarios WHERE id IN (${placeholders})`,
        numericUserIds
      );
      for (const u of userRows) {
        userMap.set(Number(u.id), {
          id: Number(u.id),
          nome: u.nome,
          email: u.email,
          papel: u.papel || 'usuario',
        });
      }
    } catch (err) {
      console.warn('[adminController] Could not enrich log user identities:', err.message);
    }
  }

  return rawLogs.map((l) => {
    const uidNum = Number.parseInt(String(l.usuario_id || ''), 10);
    const userInfo = Number.isFinite(uidNum) ? userMap.get(uidNum) || null : null;
    const { category, status } = classifyLogEvent(l.acao);
    const cleanDetails = sanitizeMetadata(l.detalhes);

    return {
      id: l.id,
      timestamp: l.timestamp,
      usuario_id: l.usuario_id,
      userName: userInfo ? userInfo.nome : null,
      userEmail: userInfo ? userInfo.email : (typeof cleanDetails?.email === 'string' ? cleanDetails.email : null),
      eventType: category,
      acao: l.acao,
      description: describeLogEvent({ ...l, detalhes: cleanDetails }),
      status,
      ip: l.ip || null,
      detalhes: cleanDetails,
    };
  });
}

/**
 * GET /api/admin/metrics
 * Protected by authMiddleware + requireAdmin.
 */
async function getMetrics(req, res) {
  try {
    // 1. Mutually exclusive user counts by plan directly from MariaDB
    const [userRows] = await pool.query(`
      SELECT
        SUM(CASE WHEN LOWER(TRIM(email)) = 'danielpgmarcal@gmail.com' AND papel = 'admin' THEN 1 ELSE 0 END) AS adminCount,
        SUM(CASE WHEN NOT (LOWER(TRIM(email)) = 'danielpgmarcal@gmail.com' AND papel = 'admin') AND papel = 'premium' THEN 1 ELSE 0 END) AS proCount,
        SUM(CASE WHEN NOT (LOWER(TRIM(email)) = 'danielpgmarcal@gmail.com' AND papel = 'admin') AND (papel IS NULL OR papel != 'premium') THEN 1 ELSE 0 END) AS freeCount,
        SUM(CASE WHEN email_verificado = 1 THEN 1 ELSE 0 END) AS verifiedCount,
        SUM(CASE WHEN ultimo_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS active30dCount,
        COUNT(*) AS totalCount
      FROM usuarios
    `);

    const u = userRows[0] || {};
    const free = Number(u.freeCount || 0);
    const pro = Number(u.proCount || 0);
    const admin = Number(u.adminCount || 0);
    const verified = Number(u.verifiedCount || 0);
    const activeLast30Days = Number(u.active30dCount || 0);
    const totalUsers = Number(u.totalCount || 0);

    // 2. Stripe subscription status breakdown from stripe_subscriptions
    const [subStatusRows] = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM stripe_subscriptions
      GROUP BY status
    `);

    const byStatus = {};
    let totalSubscriptionRecords = 0;
    for (const row of subStatusRows) {
      const key = String(row.status || 'unknown').toLowerCase();
      const count = Number(row.count || 0);
      byStatus[key] = (byStatus[key] || 0) + count;
      totalSubscriptionRecords += count;
    }

    const active = Number(byStatus.active || 0);
    const trialing = Number(byStatus.trialing || 0);
    const pastDue = Number(byStatus.past_due || 0);
    const canceled = Number(byStatus.canceled || 0);
    const incomplete = Number((byStatus.incomplete || 0) + (byStatus.incomplete_expired || 0));
    const unpaid = Number(byStatus.unpaid || 0);
    const inactive = Number(byStatus.inactive || 0);
    const totalActive = active + trialing;

    // 3. Estimated MRR (activeSubscriptions * 14.90)
    const estimatedTestMrr = Number((totalActive * PRO_MONTHLY_PRICE).toFixed(2));

    // 4. Real database content counts
    const [[letterStats]] = await pool.query(`
      SELECT
        COUNT(*) AS totalLetters,
        SUM(CASE WHEN usuario_id IS NOT NULL AND (na_lixeira IS NULL OR na_lixeira = FALSE) THEN 1 ELSE 0 END) AS userAuthoredLetters,
        SUM(CASE WHEN usuario_id IS NOT NULL AND status_carta = 'draft' AND (na_lixeira IS NULL OR na_lixeira = FALSE) THEN 1 ELSE 0 END) AS draftLetters,
        SUM(CASE WHEN usuario_id IS NULL AND is_public = TRUE THEN 1 ELSE 0 END) AS curatedPublicLetters,
        SUM(CASE WHEN na_lixeira = TRUE THEN 1 ELSE 0 END) AS trashedLetters
      FROM cartas
    `);

    const [[notebookStats]] = await pool.query(`SELECT COUNT(*) AS totalNotebooks FROM cadernos`);
    const [[folderStats]] = await pool.query(`SELECT COUNT(*) AS totalFolders FROM pastas_cartas`);
    const [[savedLetterStats]] = await pool.query(`SELECT COUNT(*) AS totalSaved FROM carta_favoritos`);

    // 5. Recent application events from log-service (non-blocking fallback if log-service is unreachable)
    let recentEvents = [];
    let recentEventsError = null;
    try {
      const rawLogsRes = await getAuditLogs({ limit: 8 });
      const rawLogs = Array.isArray(rawLogsRes?.logs) ? rawLogsRes.logs : [];
      recentEvents = await enrichLogsWithUserIdentities(rawLogs);
    } catch (logErr) {
      recentEventsError = logErr.message || 'Audit log service temporarily unavailable.';
    }

    return res.json({
      users: {
        free,
        pro,
        admin,
        verified,
        activeLast30Days,
        total: totalUsers,
      },
      subscriptions: {
        active,
        trialing,
        pastDue,
        canceled,
        incomplete,
        unpaid,
        inactive,
        totalActive,
        totalRecords: totalSubscriptionRecords,
        byStatus,
      },
      mrr: {
        estimatedTestMrr,
        monthlyPrice: PRO_MONTHLY_PRICE,
        activeSubscriptions: totalActive,
        formula: 'activeSubscriptions * 14.90',
        currency: 'USD',
        currencyBrl: 'BRL',
        isEstimate: true,
        revenueTrackedInDb: false,
        disclaimer:
          'Estimated test MRR calculated as active subscriptions (active + trialing) × $14.90/month. Canceled, unpaid, and past-due subscriptions are not counted as active revenue.',
      },
      application: {
        letters: {
          total: Number(letterStats?.totalLetters || 0),
          userAuthored: Number(letterStats?.userAuthoredLetters || 0),
          drafts: Number(letterStats?.draftLetters || 0),
          curatedPublic: Number(letterStats?.curatedPublicLetters || 0),
          inTrash: Number(letterStats?.trashedLetters || 0),
        },
        journals: {
          notebooks: Number(notebookStats?.totalNotebooks || 0),
        },
        folders: {
          total: Number(folderStats?.totalFolders || 0),
        },
        savedLetters: {
          total: Number(savedLetterStats?.totalSaved || 0),
        },
        storageTracked: false,
      },
      recentEvents,
      recentEventsError,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[adminController] getMetrics error:', error.message);
    return res.status(500).json({ error: 'Unable to retrieve administrative metrics from database.' });
  }
}

/**
 * GET /api/admin/users
 * Paginated user listing (max 20 users per request, explicit columns only, parameterized queries).
 */
async function listUsers(req, res) {
  try {
    const rawLimit = Number.parseInt(String(req.query.limit || '20'), 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), MAX_USERS_PAGE_SIZE)
      : MAX_USERS_PAGE_SIZE;

    const rawPage = Number.parseInt(String(req.query.page || '1'), 10);
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;

    const rawSearch = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 120) : '';
    const rawPlan = typeof req.query.plan === 'string' ? req.query.plan.trim().toLowerCase() : '';
    const rawSubStatus =
      typeof req.query.subscriptionStatus === 'string' ? req.query.subscriptionStatus.trim().toLowerCase() : '';

    const whereClauses = [];
    const whereParams = [];

    if (rawSearch.length > 0) {
      const likePattern = `%${escapeLike(rawSearch)}%`;
      whereClauses.push("(u.nome LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\')");
      whereParams.push(likePattern, likePattern);
    }

    if (rawPlan === 'admin') {
      whereClauses.push("(LOWER(TRIM(u.email)) = 'danielpgmarcal@gmail.com' AND u.papel = 'admin')");
    } else if (rawPlan === 'pro' || rawPlan === 'premium') {
      whereClauses.push("(NOT (LOWER(TRIM(u.email)) = 'danielpgmarcal@gmail.com' AND u.papel = 'admin') AND u.papel = 'premium')");
    } else if (rawPlan === 'free' || rawPlan === 'usuario') {
      whereClauses.push("(NOT (LOWER(TRIM(u.email)) = 'danielpgmarcal@gmail.com' AND u.papel = 'admin') AND (u.papel IS NULL OR u.papel != 'premium'))");
    }

    if (rawSubStatus) {
      if (rawSubStatus === 'none') {
        whereClauses.push('s.status IS NULL');
      } else {
        whereClauses.push('s.status = ?');
        whereParams.push(rawSubStatus);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM usuarios u
       LEFT JOIN stripe_subscriptions s ON s.usuario_id = u.id
       ${whereSql}`,
      whereParams
    );

    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

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
        u.ultimo_login,
        s.status AS subscription_status,
        s.periodo_fim AS subscription_period_end,
        (SELECT COUNT(*) FROM cadernos c WHERE c.usuario_id = u.id) AS journals_count,
        (SELECT COUNT(*) FROM cartas ct WHERE ct.usuario_id = u.id AND (ct.na_lixeira IS NULL OR ct.na_lixeira = FALSE)) AS letters_count
      FROM usuarios u
      LEFT JOIN stripe_subscriptions s ON s.usuario_id = u.id
      ${whereSql}
      ORDER BY u.criado_em DESC, u.id DESC
      LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );

    const users = rows.map((row) => {
      const { role, plan } = resolveUserPlan(row.email, row.papel);
      return {
        id: Number(row.id),
        nome: row.nome,
        email: row.email,
        papel: role,
        plan,
        subscriptionStatus: row.subscription_status || null,
        subscriptionPeriodEnd: row.subscription_period_end || null,
        emailVerificado: Boolean(row.email_verificado),
        statusConta: row.status_conta || 'ativo',
        authProvider: row.auth_provider || 'local',
        criadoEm: row.criado_em || null,
        ultimoLogin: row.ultimo_login || null,
        journalsCount: Number(row.journals_count || 0),
        lettersCount: Number(row.letters_count || 0),
      };
    });

    return res.json({
      users,
      pagination: {
        page: safePage,
        limit,
        maxPageSize: MAX_USERS_PAGE_SIZE,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
    });
  } catch (error) {
    console.error('[adminController] listUsers error:', error.message);
    return res.status(500).json({ error: 'Unable to load user directory from database.' });
  }
}

/**
 * GET /api/admin/users/:id
 * Detailed Account View for a single user (account info, subscription details, usage metrics, and account activity logs).
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
        u.onboarding_concluido,
        u.criado_em,
        u.ultimo_login
      FROM usuarios u
      WHERE u.id = ?
      LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const row = rows[0];
    const { role, plan } = resolveUserPlan(row.email, row.papel);

    // Subscription record
    const [subRows] = await pool.query(
      `SELECT
        stripe_customer_id,
        stripe_subscription_id,
        status,
        periodo_inicio,
        periodo_fim,
        criado_em,
        atualizado_em
       FROM stripe_subscriptions
       WHERE usuario_id = ?
       ORDER BY atualizado_em DESC, criado_em DESC
       LIMIT 1`,
      [userId]
    );
    const sub = subRows[0] || null;

    // Usage metrics from MariaDB
    const [[letterBreakdown]] = await pool.query(
      `SELECT
        COUNT(*) AS totalAuthored,
        SUM(CASE WHEN (na_lixeira IS NULL OR na_lixeira = FALSE) AND (status_carta IS NULL OR status_carta = 'completed') THEN 1 ELSE 0 END) AS activeLetters,
        SUM(CASE WHEN (na_lixeira IS NULL OR na_lixeira = FALSE) AND status_carta = 'draft' THEN 1 ELSE 0 END) AS draftLetters,
        SUM(CASE WHEN na_lixeira = TRUE THEN 1 ELSE 0 END) AS trashedLetters
       FROM cartas
       WHERE usuario_id = ?`,
      [userId]
    );

    const [notebookRows] = await pool.query(
      `SELECT id, client_id, nome, cor_capa, paginas_json, criado_em, atualizado_em
       FROM cadernos
       WHERE usuario_id = ?
       ORDER BY atualizado_em DESC`,
      [userId]
    );

    let totalJournalPages = 0;
    let totalJournalMediaAttachments = 0;
    for (const nb of notebookRows) {
      try {
        const pages = JSON.parse(nb.paginas_json || '[]');
        if (Array.isArray(pages)) {
          totalJournalPages += pages.length;
          for (const p of pages) {
            if (p && Array.isArray(p.attachments)) {
              totalJournalMediaAttachments += p.attachments.length;
            }
          }
        }
      } catch {}
    }

    const [[folderStats]] = await pool.query(
      'SELECT COUNT(*) AS count FROM pastas_cartas WHERE usuario_id = ?',
      [userId]
    );

    const [[savedLettersStats]] = await pool.query(
      'SELECT COUNT(*) AS count FROM carta_favoritos WHERE usuario_id = ?',
      [userId]
    );

    const [[notesStats]] = await pool.query(
      'SELECT COUNT(*) AS count FROM notas_cartas WHERE usuario_id = ?',
      [userId]
    );

    // Account activity events from log-service
    let recentActivity = [];
    let activityLogsError = null;
    try {
      const rawLogsRes = await getAuditLogs({ usuario_id: String(userId), limit: 30 });
      const rawLogs = Array.isArray(rawLogsRes?.logs) ? rawLogsRes.logs : [];
      recentActivity = await enrichLogsWithUserIdentities(rawLogs);
    } catch (logErr) {
      activityLogsError = logErr.message || 'Unable to load user activity logs from log-service.';
    }

    sendLog('ADMIN_USER_VIEWED', req, {
      usuario_id: req.usuarioId,
      target_usuario_id: userId,
    });

    const isProTier = plan === 'Pro' || plan === 'Admin';

    return res.json({
      user: {
        id: Number(row.id),
        nome: row.nome,
        email: row.email,
        papel: role,
        plan,
        emailVerificado: Boolean(row.email_verificado),
        statusConta: row.status_conta || 'ativo',
        authProvider: row.auth_provider || 'local',
        onboardingConcluido: Boolean(row.onboarding_concluido),
        criadoEm: row.criado_em || null,
        ultimoLogin: row.ultimo_login || null,
        usage: {
          journals: {
            count: notebookRows.length,
            limit: isProTier ? 10 : 3,
            pagesCount: totalJournalPages,
            mediaAttachmentsCount: totalJournalMediaAttachments,
          },
          letters: {
            active: Number(letterBreakdown?.activeLetters || 0),
            drafts: Number(letterBreakdown?.draftLetters || 0),
            inTrash: Number(letterBreakdown?.trashedLetters || 0),
            totalNonTrash:
              Number(letterBreakdown?.activeLetters || 0) + Number(letterBreakdown?.draftLetters || 0),
            totalAuthored: Number(letterBreakdown?.totalAuthored || 0),
            limit: isProTier ? 30 : 10,
          },
          folders: {
            count: Number(folderStats?.count || 0),
            limit: isProTier ? 10 : 3,
          },
          savedArchiveLetters: {
            count: Number(savedLettersStats?.count || 0),
            limit: isProTier ? null : 5,
          },
          marginalNotes: {
            count: Number(notesStats?.count || 0),
          },
          storage: {
            trackedInDb: false,
            mediaAttachmentsCount: totalJournalMediaAttachments,
            note: 'Byte-level storage size is not tracked in MariaDB.',
          },
        },
        activity: {
          letters:
            Number(letterBreakdown?.activeLetters || 0) + Number(letterBreakdown?.draftLetters || 0),
          notebooks: notebookRows.length,
          folders: Number(folderStats?.count || 0),
          pagesWritten: totalJournalPages,
          savedArchiveLetters: Number(savedLettersStats?.count || 0),
        },
        subscription: sub
          ? {
              stripeCustomerId: sub.stripe_customer_id || null,
              stripeSubscriptionId: sub.stripe_subscription_id || null,
              status: sub.status,
              criadoEm: sub.criado_em || null,
              periodoInicio: sub.periodo_inicio || null,
              periodoFim: sub.periodo_fim || null,
              atualizadoEm: sub.atualizado_em || null,
            }
          : null,
        recentActivity,
        activityLogsError,
      },
    });
  } catch (error) {
    console.error('[adminController] getUserDetail error:', error.message);
    return res.status(500).json({ error: 'Unable to load account details from database.' });
  }
}

/**
 * GET /api/admin/logs
 * Searchable, filterable, paginated audit log viewer backed by log-service (Redis Streams)
 * and enriched with MariaDB user identities.
 */
async function getLogs(req, res) {
  try {
    const rawLimit = Number.parseInt(String(req.query.limit || '25'), 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), MAX_LOGS_PAGE_SIZE)
      : 25;

    const rawPage = Number.parseInt(String(req.query.page || '1'), 10);
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;

    const filterUserId = req.query.usuario_id ? String(req.query.usuario_id).trim() : '';
    const filterAction = req.query.acao ? String(req.query.acao).trim().toUpperCase() : '';
    const filterEventType = req.query.eventType ? String(req.query.eventType).trim().toUpperCase() : '';
    const searchQuery = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
    const fromDate = req.query.from ? new Date(String(req.query.from)) : null;
    const toDate = req.query.to ? new Date(String(req.query.to)) : null;

    // Fetch bounded window from log-service (max 500 entries)
    const upstreamRes = await getAuditLogs({
      limit: 500,
      acao: filterAction || undefined,
      usuario_id: filterUserId || undefined,
    });

    const rawLogs = Array.isArray(upstreamRes?.logs) ? upstreamRes.logs : [];
    let enriched = await enrichLogsWithUserIdentities(rawLogs);

    if (filterEventType && filterEventType !== 'ALL') {
      enriched = enriched.filter((l) => l.eventType === filterEventType);
    }

    if (fromDate && !Number.isNaN(fromDate.getTime())) {
      const fromMs = fromDate.getTime();
      enriched = enriched.filter((l) => {
        const ts = new Date(l.timestamp).getTime();
        return Number.isFinite(ts) && ts >= fromMs;
      });
    }

    if (toDate && !Number.isNaN(toDate.getTime())) {
      // If a date-only string YYYY-MM-DD was provided, include the full day
      const toStr = String(req.query.to).trim();
      const endMs =
        /^\d{4}-\d{2}-\d{2}$/.test(toStr)
          ? toDate.getTime() + 24 * 60 * 60 * 1000 - 1
          : toDate.getTime();
      enriched = enriched.filter((l) => {
        const ts = new Date(l.timestamp).getTime();
        return Number.isFinite(ts) && ts <= endMs;
      });
    }

    if (searchQuery) {
      enriched = enriched.filter((l) => {
        const haystack = [
          l.acao,
          l.eventType,
          l.usuario_id,
          l.userName,
          l.userEmail,
          l.description,
          l.ip,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchQuery);
      });
    }

    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    const paginatedLogs = enriched.slice(offset, offset + limit);

    return res.json({
      total,
      page: safePage,
      limit,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
      stream: upstreamRes?.stream || 'logs:audit',
      logs: paginatedLogs,
    });
  } catch (error) {
    console.error('[adminController] getLogs error:', error.message);
    return res.status(502).json({
      error: error.message || 'Unable to retrieve audit logs from log-service.',
    });
  }
}

module.exports = {
  getMetrics,
  listUsers,
  getUserDetail,
  getLogs,
  MAX_USERS_PAGE_SIZE,
};
