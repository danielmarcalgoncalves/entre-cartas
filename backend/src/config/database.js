const mysql = require('mysql2/promise');
require('dotenv').config();
const { cartasIniciais } = require('./seedCartas');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
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
    // MODELAGEM ENTRE CARTAS (Catálogo Epistolar & Scrapbook)
    // ========================================================

    // 4. Tabela de Cartas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cartas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NULL,
        titulo VARCHAR(255) NOT NULL,
        conteudo MEDIUMTEXT NOT NULL,
        remetente_anonimo VARCHAR(100) DEFAULT 'Anônimo',
        destinatario_anonimo VARCHAR(100) DEFAULT NULL,
        categoria VARCHAR(50) NOT NULL DEFAULT 'desabafo',
        tipo_papel VARCHAR(50) DEFAULT 'envelhecido',
        selo_url VARCHAR(500) DEFAULT NULL,
        lacre_cera_cor VARCHAR(30) DEFAULT 'vinho',
        data_carta VARCHAR(100) DEFAULT NULL,
        status_curadoria VARCHAR(30) DEFAULT 'aprovada',
        leituras_count INT DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        INDEX idx_categoria (categoria),
        INDEX idx_status (status_curadoria)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Tabela de Cartas Favoritadas com Carimbo Físico (Plano Free vs Pro)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS carta_favoritos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        carta_id INT NOT NULL,
        tipo_carimbo VARCHAR(50) DEFAULT 'LIDA',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (carta_id) REFERENCES cartas(id) ON DELETE CASCADE,
        UNIQUE KEY uk_usuario_carta (usuario_id, carta_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Pastas de Arquivo e Memórias (Scrapbook Folders)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pastas_memorias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT NULL,
        cor_pasta VARCHAR(50) DEFAULT 'kraft',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Itens dentro de cada pasta de memórias
    await connection.query(`
      CREATE TABLE IF NOT EXISTS itens_pasta (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pasta_id INT NOT NULL,
        carta_id INT NOT NULL,
        nota_pessoal TEXT NULL,
        adicionado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pasta_id) REFERENCES pastas_memorias(id) ON DELETE CASCADE,
        FOREIGN KEY (carta_id) REFERENCES cartas(id) ON DELETE CASCADE,
        UNIQUE KEY uk_pasta_carta (pasta_id, carta_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Notas marginais / bilhetes anexados às cartas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notas_cartas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        carta_id INT NOT NULL,
        usuario_id INT NOT NULL,
        texto TEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (carta_id) REFERENCES cartas(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
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
        INDEX idx_stripe_subscription (stripe_subscription_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

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

    // ========================================================
    // SEED AUTOMÁTICO DE CARTAS INICIAIS
    // ========================================================
    const [cartasCount] = await connection.query('SELECT COUNT(*) as total FROM cartas');
    if (cartasCount[0].total === 0) {
      console.log('[Database] Tabela cartas vazia. Inserindo acervo epistolar inicial...');
      for (const carta of cartasIniciais) {
        await connection.query(
          `INSERT INTO cartas (titulo, conteudo, remetente_anonimo, destinatario_anonimo, categoria, tipo_papel, lacre_cera_cor, data_carta, leituras_count, status_curadoria)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aprovada')`,
          [
            carta.titulo,
            carta.conteudo,
            carta.remetente_anonimo,
            carta.destinatario_anonimo,
            carta.categoria,
            carta.tipo_papel,
            carta.lacre_cera_cor,
            carta.data_carta,
            carta.leituras_count || 0
          ]
        );
      }
      console.log(`[Database] Seed concluído: ${cartasIniciais.length} cartas inseridas no acervo com sucesso!`);
    } else {
      console.log(`[Database] Acervo de cartas pronto (${cartasCount[0].total} cartas catalogadas).`);
    }

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
