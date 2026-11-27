const mysql = require('mysql2/promise');
require('dotenv').config();

const IS_PROD = process.env.NODE_ENV === 'production';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
if (IS_PROD && (!DB_PASSWORD.trim() || DB_PASSWORD.trim() === 'root_password')) {
  throw new Error('[SECURITY] DB_PASSWORD must be configured with a non-default password in production.');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: DB_PASSWORD,
  database: process.env.DB_NAME || 'filmes_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Inicialização automática das tabelas com política de retentativa para garantir tolerância a falhas no Docker
async function initDb(retries = 15, delay = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('[Database] Conexão com o MariaDB estabelecida com sucesso.');

    // 1. Criação da tabela de usuários
    await connection.query(`
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

    // 2. Criação da tabela de reset_tokens
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reset_tokens (
        token VARCHAR(255) PRIMARY KEY,
        usuario_id INT NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expira_em TIMESTAMP NOT NULL,
        usado BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrações dinâmicas seguras para tabela usuarios
    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN papel VARCHAR(50) DEFAULT 'usuario';`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN email_verificado BOOLEAN DEFAULT FALSE;`);
      await connection.query(`UPDATE usuarios SET email_verificado = TRUE WHERE email_verificado IS NULL;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN foto_url VARCHAR(500) DEFAULT NULL;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN bio TEXT DEFAULT NULL;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local';`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) DEFAULT NULL;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN ultimo_login TIMESTAMP NULL DEFAULT NULL;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN status_conta VARCHAR(30) DEFAULT 'ativo';`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN onboarding_concluido BOOLEAN DEFAULT FALSE;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN token_version INT NOT NULL DEFAULT 1;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE usuarios ADD INDEX idx_usuarios_papel (papel);`);
    } catch (e) {}

    // Enforce exclusive administrator role for danielpgmarcal@gmail.com
    try {
      await connection.query(
        `UPDATE usuarios SET papel = 'admin' WHERE LOWER(TRIM(email)) = 'danielpgmarcal@gmail.com' AND papel != 'admin'`
      );
      await connection.query(
        `UPDATE usuarios SET papel = 'usuario' WHERE LOWER(TRIM(email)) != 'danielpgmarcal@gmail.com' AND papel = 'admin'`
      );
    } catch (e) {}

    // 3. Códigos de verificação OTP
    await connection.query(`
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

    // ========================================================
    // MODELAGEM BETWEEN LETTERS (Personal Journals & Auth)
    // Legacy Letters tables (cartas, carta_favoritos, pastas_memorias,
    // itens_pasta, notas_cartas, pastas_cartas) are no longer provisioned
    // on fresh installs; historical tables are left untouched unless
    // explicitly archived via backend/migrations/2026-11-27_decommission_letters_tables.sql.
    // ========================================================

    // 4. Revoked session tokens (logout invalidation)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        token_hash VARCHAR(64) PRIMARY KEY,
        usuario_id INT NULL,
        expira_em DATETIME NOT NULL,
        revogado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_expira (expira_em)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Personal Journal Volumes (cadernos) & Pages (persisted per authenticated user)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cadernos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id VARCHAR(120) NOT NULL,
        usuario_id INT NOT NULL,
        nome VARCHAR(120) NOT NULL,
        cor_capa VARCHAR(30) DEFAULT 'marrom',
        paginas_json LONGTEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE KEY uk_usuario_caderno (usuario_id, client_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // ========================================================
    // TABELAS STRIPE (Plano Pro & Assinaturas)
    // ========================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS stripe_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        stripe_customer_id VARCHAR(255) NULL,
        stripe_subscription_id VARCHAR(255) NULL,
        status VARCHAR(50) DEFAULT 'inactive',
        periodo_inicio DATETIME NULL,
        periodo_fim DATETIME NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE KEY uk_usuario_stripe (usuario_id),
        INDEX idx_stripe_customer (stripe_customer_id),
        INDEX idx_stripe_subscription (stripe_subscription_id),
        INDEX idx_stripe_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    try {
      await connection.query(`ALTER TABLE stripe_subscriptions ADD INDEX idx_stripe_status (status);`);
    } catch (e) {}

    await connection.query(`
      CREATE TABLE IF NOT EXISTS stripe_webhook_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        processado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_event_id (stripe_event_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tabelas legadas para compatibilidade
    await connection.query(`
      CREATE TABLE IF NOT EXISTS favoritos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tmdb_movie_id INT NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        poster_path VARCHAR(255),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE KEY uk_usuario_filme (usuario_id, tmdb_movie_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS comentarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tmdb_movie_id INT NOT NULL,
        texto TEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    connection.release();
    console.log('[Database] Todas as tabelas e índices verificados e prontos para uso.');
    return;
  } catch (error) {
    if (i === retries) {
      console.error('[Database] Aviso ao conectar/inicializar tabelas no MariaDB:', error.message);
      console.error('[Database] Certifique-se de configurar corretamente as variáveis DB_HOST, DB_USER, DB_PASSWORD e DB_NAME.');
      return;
    }
    console.warn(`[Database] MariaDB ainda inicializando (tentativa ${i}/${retries}: ${error.message}). Nova tentativa em ${delay / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  pool,
  initDb
};
