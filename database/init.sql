-- Script de Inicialização do Banco de Dados MariaDB
-- Entre Cartas — Arquivo Epistolar Afetivo
-- Disciplina do Professor @siriani

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

CREATE TABLE IF NOT EXISTS codigos_verificacao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  codigo VARCHAR(10) NOT NULL,
  expira_em DATETIME NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_codigo (email, codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reset_tokens (
  token VARCHAR(255) PRIMARY KEY,
  usuario_id INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expira_em TIMESTAMP NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- DOMÍNIO DO ENTRE CARTAS: CARTAS, MEMÓRIAS E CARIMBOS
-- ========================================================

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

-- Cartas favoritadas/guardadas na caixa de memórias com carimbo físico
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

-- Pastas temáticas de arquivo (scrapbook folders)
CREATE TABLE IF NOT EXISTS pastas_memorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT NULL,
  cor_pasta VARCHAR(50) DEFAULT 'kraft',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Associação entre cartas e pastas
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

-- Notas marginais / bilhetes anexados às cartas
CREATE TABLE IF NOT EXISTS notas_cartas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  carta_id INT NOT NULL,
  usuario_id INT NOT NULL,
  texto TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (carta_id) REFERENCES cartas(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelas legadas mantidas para retrocompatibilidade
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

CREATE TABLE IF NOT EXISTS comentarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tmdb_movie_id INT NOT NULL,
  texto TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  periodo_inicio TIMESTAMP NULL,
  periodo_fim TIMESTAMP NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE KEY uk_usuario_stripe (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
  tipo VARCHAR(100) NOT NULL,
  processado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
