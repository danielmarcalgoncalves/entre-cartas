require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
const { securityHeaders, csrfProtection } = require('./src/middlewares/security');

const app = express();

// Headers de segurança e proteção HTTP
app.use(securityHeaders);

// ⚠️ IMPORTANTE: O webhook do Stripe DEVE ser registrado ANTES do express.json() global.
// A rota /api/stripe/webhook usa express.raw() internamente para preservar o corpo
// original da requisição, necessário para validação criptográfica da assinatura do Stripe.
app.use('/api/stripe', stripeRoutes);

// Configuração de CORS (permitindo envio de cookies/credentials) e Parsers
app.use(cors({
  origin: true,
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

// Rota direta de administração para Logs de Auditoria (Atividade 5 - RBAC Admin)
const authController = require('./src/controllers/authController');
const { authMiddleware, requireAdmin } = require('./src/middlewares/auth');
app.get('/api/admin/logs', authMiddleware, requireAdmin, authController.getAuditLogs);

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
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    // Se for rota da API, retorna 404 JSON
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Rota de API não encontrada' });
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
    const { ensureBucket } = require('./src/services/minioClient');
    ensureBucket().catch(err => console.warn('[MinIO] Bucket nao verificado:', err.message));
  });
}

startServer();

