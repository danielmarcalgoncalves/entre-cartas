require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const { initDb } = require('./src/config/database');

const authRoutes = require('./src/routes/authRoutes');
const cartasRoutes = require('./src/routes/cartasRoutes');
const moviesRoutes = require('./src/routes/moviesRoutes');
const favoritesRoutes = require('./src/routes/favoritesRoutes');
const commentsRoutes = require('./src/routes/commentsRoutes');
const listsRoutes = require('./src/routes/listsRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const stripeRoutes = require('./src/routes/stripeRoutes');
const journalRoutes = require('./src/routes/journalRoutes');

let cookieParser;
try {
  cookieParser = require('cookie-parser');
} catch (e) {
  // Fallback nativo e leve caso cookie-parser ainda não tenha sido instalado no container
  cookieParser = () => (req, res, next) => {
    req.cookies = req.cookies || {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      cookieHeader.split(';').forEach(c => {
        const [k, ...v] = c.trim().split('=');
        if (k) req.cookies[k] = decodeURIComponent(v.join('='));
      });
    }
    next();
  };
}
const { securityHeaders, noStoreHeaders, csrfProtection } = require('./src/middlewares/security');

function validateAdminPanelRouteKey() {
  const raw = (process.env.ADMIN_PANEL_ROUTE_KEY || '').trim();
  const forbidden = new Set(['admin', 'control', 'panel', 'dashboard', 'root', 'workspace']);
  if (!raw || raw.length < 32 || !/^[A-Za-z0-9_-]+$/.test(raw) || forbidden.has(raw.toLowerCase())) {
    console.error(
      '[SECURITY] ADMIN_PANEL_ROUTE_KEY is missing or invalid (must be >= 32 URL-safe chars). Private admin panel route is disabled.'
    );
    return null;
  }
  return raw;
}

const ADMIN_PANEL_ROUTE_KEY = validateAdminPanelRouteKey();

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const allowed = new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);
    if (process.env.APP_URL) {
      allowed.add(new URL(process.env.APP_URL).origin);
    }
    return allowed.has(parsed.origin);
  } catch {
    return false;
  }
}

const app = express();
const trustProxyEnv = process.env.TRUST_PROXY;
app.set('trust proxy', trustProxyEnv ? (Number(trustProxyEnv) || trustProxyEnv) : false);

// Headers de segurança e proteção HTTP
app.use(securityHeaders);

// ⚠️ IMPORTANTE: O webhook do Stripe DEVE ser registrado ANTES do express.json() global.
// A rota /api/stripe/webhook usa express.raw() internamente para preservar o corpo
// original da requisição, necessário para validação criptográfica da assinatura do Stripe.
app.use('/api/stripe', stripeRoutes);

// Configuração de CORS (permitindo envio de cookies/credentials apenas para origens confiáveis) e Parsers
app.use(cors({
  origin(origin, callback) {
    if (isAllowedCorsOrigin(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));
app.use(cookieParser());
app.use(csrfProtection);
app.use(express.json({ limit: '1mb' }));

// Rotas da API
app.use('/api/cartas', cartasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/lists', listsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/journal', journalRoutes);

// Rotas diretas de administração (RBAC Admin + no-store cache)
const authController = require('./src/controllers/authController');
const adminController = require('./src/controllers/adminController');
const { authMiddleware, requireAdmin } = require('./src/middlewares/auth');
app.get('/api/admin/logs', authMiddleware, requireAdmin, noStoreHeaders, authController.getAuditLogs);
app.get('/api/admin/metrics', authMiddleware, requireAdmin, noStoreHeaders, adminController.getMetrics);
app.get('/api/admin/users', authMiddleware, requireAdmin, noStoreHeaders, adminController.listUsers);
app.get('/api/admin/users/:id', authMiddleware, requireAdmin, noStoreHeaders, adminController.getUserDetail);

// Health check para monitoramento e Portainer
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Entre Cartas — Arquivo Epistolar',
    discipline: 'Computação em Nuvem / Professor @siriani',
    timestamp: new Date().toISOString()
  });
});

// Servir frontend compilado em produção
const publicPath = path.join(__dirname, 'public');
const outPath = path.join(__dirname, '..', 'frontend', 'out');
const distPath = path.join(__dirname, '..', 'frontend', 'dist');

let staticPath = null;
if (fs.existsSync(path.join(publicPath, 'index.html'))) {
  staticPath = publicPath;
} else if (fs.existsSync(path.join(outPath, 'index.html'))) {
  staticPath = outPath;
} else if (fs.existsSync(path.join(distPath, 'index.html'))) {
  staticPath = distPath;
}

if (staticPath) {
  const notFoundHtml = path.join(staticPath, '404.html');
  const sendNotFound = (res) => {
    res.status(404);
    if (fs.existsSync(notFoundHtml)) {
      return res.sendFile(notFoundHtml);
    }
    return res.send('Not Found');
  };

  // Bloqueia explicitamente a antiga rota pública /admin (sem redirecionamento nem divulgação)
  app.get(['/admin', '/admin/*'], (req, res) => sendNotFound(res));

  // Rota privada do painel administrativo: serve o shell estático apenas para a chave exata
  app.get(['/control', '/control/*'], (req, res) => {
    if (!ADMIN_PANEL_ROUTE_KEY) {
      return sendNotFound(res);
    }
    const cleanPath = req.path.replace(/\/+$/, '');
    const prefix = '/control/';
    if (!cleanPath.startsWith(prefix)) {
      return sendNotFound(res);
    }
    const candidateKey = cleanPath.slice(prefix.length);
    if (!candidateKey || candidateKey.includes('/')) {
      return sendNotFound(res);
    }
    const expectedBuf = Buffer.from(ADMIN_PANEL_ROUTE_KEY, 'utf8');
    const candidateBuf = Buffer.from(candidateKey, 'utf8');
    if (expectedBuf.length !== candidateBuf.length || !crypto.timingSafeEqual(expectedBuf, candidateBuf)) {
      return sendNotFound(res);
    }
    const controlShellHtml = path.join(staticPath, 'control', 'panel.html');
    if (!fs.existsSync(controlShellHtml)) {
      return sendNotFound(res);
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return res.sendFile(controlShellHtml);
  });

  app.use(express.static(staticPath, { redirect: false, extensions: ['html'] }));
  app.get('*', (req, res) => {
    // Se for rota da API, retorna 404 JSON
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }

    // Se existir arquivo HTML estático gerado para esta rota específica (ex: /discover.html, /clube-pro.html)
    const cleanPath = req.path.replace(/\/$/, '');
    const specificHtml = path.join(staticPath, `${cleanPath}.html`);
    if (cleanPath && fs.existsSync(specificHtml)) {
      return res.sendFile(specificHtml);
    }

    // Fallback padrão para index.html
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'API do Entre Cartas está rodando!',
      endpoints: {
        cartas: '/api/cartas',
        categorias: '/api/cartas/categorias',
        auth: '/api/auth',
        stripe: '/api/stripe',
        health: '/api/health'
      },
      note: 'Frontend disponível em ambiente de desenvolvimento via Vite ou em produção após build.'
    });
  });
}

const PORT = process.env.PORT || process.env.RESERVED_PORT || 3000;

function startServer() {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`💌 Entre Cartas — Arquivo Epistolar & Scrapbook`);
    console.log(`👨‍🏫 Disciplina do Professor: @siriani`);
    console.log(`🚀 Servidor rodando na porta: ${PORT}`);
    console.log(`🌐 Acesse em: http://localhost:${PORT}`);
    console.log('====================================================');
    
    // Inicializa o banco e verifica tabelas
    initDb().catch(err => console.error('[Database] Inicializacao pendente:', err.message));

    // Garante que o bucket do MinIO existe (cria se necessario)
    const { ensureBucket, ensureJournalBucket } = require('./src/services/minioClient');
    ensureBucket().catch(err => console.warn('[MinIO] Bucket nao verificado:', err.message));
    ensureJournalBucket().catch(err => console.warn('[MinIO] Journal bucket not verified:', err.message));
  });
}

startServer();

