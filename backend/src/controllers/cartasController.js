const { pool } = require('../config/database');
const { sendLog } = require('../services/logClient');

const PUBLIC_ARCHIVE_CONDITION = `c.is_public = TRUE AND c.status_curadoria = 'aprovada' AND (c.status_carta IS NULL OR c.status_carta = 'completed') AND (c.na_lixeira IS NULL OR c.na_lixeira = FALSE)`;
const ACCESSIBLE_LETTER_CONDITION = `((${PUBLIC_ARCHIVE_CONDITION}) OR (? IS NOT NULL AND c.usuario_id = ? AND (c.na_lixeira IS NULL OR c.na_lixeira = FALSE)))`;

async function enforceActiveLetterQuota(connection, usuarioId, papelFallback = 'usuario') {
  const [userRows] = await connection.query(
    'SELECT id, papel FROM usuarios WHERE id = ? FOR UPDATE',
    [usuarioId]
  );
  const papelEfetivo = (userRows[0] && userRows[0].papel) || papelFallback;
  const isPremium = papelEfetivo === 'premium' || papelEfetivo === 'admin';
  const limiteCartas = isPremium ? 30 : 10;

  const [contagemCartas] = await connection.query(
    'SELECT COUNT(*) as total FROM cartas WHERE usuario_id = ? AND (na_lixeira IS NULL OR na_lixeira = FALSE)',
    [usuarioId]
  );
  const totalEscritas = contagemCartas[0] ? contagemCartas[0].total : 0;

  return {
    allowed: totalEscritas < limiteCartas,
    isPremium,
    papelEfetivo,
    limiteCartas,
    totalEscritas
  };
}

/**
 * Controller de Cartas — Entre Cartas
 * Gerencia o acervo epistolar, interações de leitura, carimbos físicos e regras de negócio SaaS.
 */

// 1. Listar cartas com filtros, paginação e indicação de carimbos
async function listarCartas(req, res) {
  try {
    const { categoria, tipo_papel, q, ordem = 'recentes', page = 1, limit = 20 } = req.query;
    const usuarioId = req.usuarioId || null;
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    let query = `
      SELECT 
        c.id,
        c.titulo,
        c.conteudo,
        c.remetente_anonimo,
        c.destinatario_anonimo,
        c.categoria,
        c.tipo_papel,
        c.selo_url,
        c.lacre_cera_cor,
        c.data_carta,
        c.leituras_count,
        c.criado_em,
        CASE WHEN cf.id IS NOT NULL THEN 1 ELSE 0 END AS guardada,
        cf.tipo_carimbo
      FROM cartas c
      LEFT JOIN carta_favoritos cf ON cf.carta_id = c.id AND cf.usuario_id = ?
      WHERE ${PUBLIC_ARCHIVE_CONDITION}
    `;

    const params = [usuarioId || 0];

    if (categoria && categoria !== 'todas') {
      query += ' AND c.categoria = ?';
      params.push(categoria);
    }

    if (tipo_papel && tipo_papel !== 'todos') {
      query += ' AND c.tipo_papel = ?';
      params.push(tipo_papel);
    }

    if (q && q.trim()) {
      query += ' AND (c.titulo LIKE ? OR c.conteudo LIKE ? OR c.remetente_anonimo LIKE ?)';
      const search = `%${q.trim()}%`;
      params.push(search, search, search);
    }

    if (ordem === 'populares') {
      query += ' ORDER BY c.leituras_count DESC, c.criado_em DESC';
    } else {
      query += ' ORDER BY c.criado_em DESC';
    }

    const offset = (safePage - 1) * safeLimit;
    query += ' LIMIT ? OFFSET ?';
    params.push(safeLimit, offset);

    const [rows] = await pool.query(query, params);

    // Contagem total para metadados de paginação
    let countQuery = `SELECT COUNT(*) as total FROM cartas c WHERE ${PUBLIC_ARCHIVE_CONDITION}`;
    const countParams = [];
    if (categoria && categoria !== 'todas') {
      countQuery += ' AND c.categoria = ?';
      countParams.push(categoria);
    }
    if (tipo_papel && tipo_papel !== 'todos') {
      countQuery += ' AND c.tipo_papel = ?';
      countParams.push(tipo_papel);
    }
    if (q && q.trim()) {
      countQuery += ' AND (c.titulo LIKE ? OR c.conteudo LIKE ? OR c.remetente_anonimo LIKE ?)';
      const search = `%${q.trim()}%`;
      countParams.push(search, search, search);
    }

    const [countRows] = await pool.query(countQuery, countParams);
    const total = countRows[0] ? countRows[0].total : 0;

    return res.json({
      total,
      pagina: safePage,
      limite: safeLimit,
      total_paginas: Math.ceil(total / safeLimit),
      cartas: rows.map(c => ({
        ...c,
        guardada: Boolean(c.guardada),
        tipo_carimbo: c.tipo_carimbo || null,
        trecho: c.conteudo.length > 220 ? c.conteudo.substring(0, 220) + '...' : c.conteudo
      }))
    });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao listar cartas:', error);
    return res.status(500).json({ error: 'Unable to load the letter archive.' });
  }
}

// 2. Obter detalhes da carta e registrar abertura no Redis Streams
async function obterCartaPorId(req, res) {
  try {
    const { id } = req.params;
    const usuarioId = req.usuarioId || null;

    const [rows] = await pool.query(
      `SELECT 
        c.*,
        CASE WHEN cf.id IS NOT NULL THEN 1 ELSE 0 END AS guardada,
        cf.tipo_carimbo,
        cf.criado_em AS guardada_em
      FROM cartas c
      LEFT JOIN carta_favoritos cf ON cf.carta_id = c.id AND cf.usuario_id = ?
      WHERE c.id = ?
        AND ((${PUBLIC_ARCHIVE_CONDITION}) OR (? IS NOT NULL AND c.usuario_id = ?))`,
      [usuarioId || 0, id, usuarioId, usuarioId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Letter not found in the archive.' });
    }

    const carta = rows[0];

    // Incrementa contagem de leituras
    await pool.query('UPDATE cartas SET leituras_count = leituras_count + 1 WHERE id = ?', [id]);

    // Busca notas marginais deixadas na carta
    const [notas] = await pool.query(
      `SELECT n.id, n.texto, n.criado_em, u.nome as autor_nome, u.foto_url as autor_foto
       FROM notas_cartas n
       LEFT JOIN usuarios u ON u.id = n.usuario_id
       WHERE n.carta_id = ?
       ORDER BY n.criado_em ASC`,
      [id]
    );

    // Registra evento de experiência sensorial no Redis Streams
    sendLog('CARTA_DESLACRADA', req, {
      carta_id: Number(id),
      titulo: carta.titulo,
      categoria: carta.categoria,
      remetente: carta.remetente_anonimo
    });

    return res.json({
      carta: {
        ...carta,
        guardada: Boolean(carta.guardada),
        leituras_count: carta.leituras_count + 1,
        notas
      }
    });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao obter carta:', error);
    return res.status(500).json({ error: 'Erro interno ao abrir a carta.' });
  }
}

// 3. Enviar uma nova carta para o acervo
async function criarCarta(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';
    const {
      titulo,
      conteudo = '',
      remetente_anonimo,
      destinatario_anonimo,
      categoria = 'desabafo',
      tipo_papel = 'envelhecido',
      lacre_cera_cor = 'vinho',
      data_carta,
      client_id = null,
      pasta_client_id = null,
      pasta_nome = null,
      fonte = 'caveat',
      status_carta = 'completed',
      tema_carta = null,
      favoritado = false
    } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'Letter title is required.' });
    }

    const normalizedStatus = status_carta === 'draft' ? 'draft' : 'completed';
    if (normalizedStatus === 'completed' && !String(conteudo).trim()) {
      return res.status(400).json({ error: 'Letter content cannot be empty.' });
    }

    // Business rule for written letter quotas (atomic transaction with user row lock):
    // - Standard User: max 10 letters
    // - Pro Sender User: max 30 letters
    let connection;
    let result;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      if (usuarioId) {
        const quota = await enforceActiveLetterQuota(connection, usuarioId, papelUsuario);
        if (!quota.allowed) {
          await connection.rollback();
          sendLog('BLOQUEIO_LIMITE_CARTAS_403', req, {
            motivo: `Limite de ${quota.limiteCartas} cartas atingido para ${quota.isPremium ? 'Plano Premium' : 'Plano Normal'}`,
            usuario_id: usuarioId,
            totalEscritas: quota.totalEscritas,
            limiteCartas: quota.limiteCartas
          });
          return res.status(403).json({
            error: quota.isPremium
              ? `You have reached the limit of ${quota.limiteCartas} archived letters on the Premium Plan.`
              : `You have reached the limit of ${quota.limiteCartas} letters on the Standard Plan. Join Pro Club to write up to 30 letters!`,
            isLimitReached: true,
            limite: quota.limiteCartas,
            upgradeToPremium: !quota.isPremium
          });
        }
      }

      [result] = await connection.query(
        `INSERT INTO cartas (usuario_id, titulo, conteudo, remetente_anonimo, destinatario_anonimo, categoria, tipo_papel, lacre_cera_cor, data_carta, client_id, pasta_client_id, pasta_nome, fonte, status_carta, tema_carta, favoritado, na_lixeira, status_curadoria, is_public)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, 'privada', FALSE)`,
        [
          usuarioId,
          titulo.trim(),
          String(conteudo || '').trim(),
          remetente_anonimo ? remetente_anonimo.trim() : 'Anonymous',
          destinatario_anonimo ? destinatario_anonimo.trim() : null,
          categoria,
          tipo_papel,
          lacre_cera_cor,
          data_carta || 'Today',
          client_id,
          pasta_client_id,
          pasta_nome,
          fonte,
          normalizedStatus,
          tema_carta,
          Boolean(favoritado) ? 1 : 0
        ]
      );

      await connection.commit();
    } catch (txErr) {
      if (connection) await connection.rollback();
      throw txErr;
    } finally {
      if (connection) connection.release();
    }

    sendLog('CARTA_ENVIADA', req, {
      carta_id: result.insertId,
      titulo,
      categoria,
      papel: papelUsuario
    });

    return res.status(201).json({
      message: normalizedStatus === 'draft' ? 'Draft saved!' : 'Letter sealed and archived in your memory box!',
      carta: {
        id: result.insertId,
        titulo: titulo.trim(),
        categoria,
        tipo_papel,
        status_carta: normalizedStatus,
        remetente_anonimo: remetente_anonimo || 'Anonymous'
      }
    });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao criar carta:', error);
    return res.status(500).json({ error: 'Unable to seal and save the letter.' });
  }
}

// 4. Carimbar e guardar carta na caixa de memórias (Regra RBAC Free vs Pro)
async function carimbarCarta(req, res) {
  let connection;
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';
    const { id } = req.params;
    const { tipo_carimbo = 'LIDA' } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [userRows] = await connection.query(
      'SELECT id, papel FROM usuarios WHERE id = ? FOR UPDATE',
      [usuarioId]
    );
    const papelEfetivo = (userRows[0] && userRows[0].papel) || papelUsuario;

    const [cartaRows] = await connection.query(
      `SELECT c.id, c.titulo, c.categoria FROM cartas c WHERE c.id = ? AND ${ACCESSIBLE_LETTER_CONDITION}`,
      [id, usuarioId, usuarioId]
    );
    if (cartaRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Letter not found for stamping.' });
    }
    const carta = cartaRows[0];

    // Regra RBAC de Monetização do Entre Cartas:
    // - Plano Leitor (Free / 'usuario'): máximo de 5 cartas guardadas
    // - Clube do Remetente Pro ('premium' ou 'admin'): ILIMITADO
    let limite = null;
    if (papelEfetivo === 'usuario') {
      limite = 5;
    }

    if (limite !== null) {
      const [countRows] = await connection.query(
        'SELECT COUNT(*) as total FROM carta_favoritos WHERE usuario_id = ?',
        [usuarioId]
      );
      const totalGuardadas = countRows[0].total;

      const [jaExiste] = await connection.query(
        'SELECT id FROM carta_favoritos WHERE usuario_id = ? AND carta_id = ?',
        [usuarioId, id]
      );

      if (totalGuardadas >= limite && jaExiste.length === 0) {
        await connection.rollback();
        sendLog('BLOQUEIO_LIMITE_CARTAS_403', req, {
          motivo: `Limite de ${limite} cartas guardadas atingido no Plano Leitor`,
          carta_id: Number(id),
          titulo: carta.titulo,
          papelAtual: papelEfetivo,
          limite
        });

        return res.status(403).json({
          error: `Your memory box has reached the limit of ${limite} saved letters. Join Pro Sender Club to collect unlimited memories!`,
          isLimitReached: true,
          limite,
          upgradeToPremium: true
        });
      }
    }

    // Insere ou atualiza o tipo de carimbo
    await connection.query(
      `INSERT INTO carta_favoritos (usuario_id, carta_id, tipo_carimbo)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE tipo_carimbo = VALUES(tipo_carimbo)`,
      [usuarioId, id, tipo_carimbo]
    );

    await connection.commit();

    sendLog('CARIMBO_APLICADO', req, {
      carta_id: Number(id),
      titulo: carta.titulo,
      tipo_carimbo,
      papel: papelEfetivo
    });

    return res.status(201).json({
      message: `Letter stamped as "${tipo_carimbo}" and saved to your memory box!`,
      carimbo: {
        carta_id: Number(id),
        tipo_carimbo,
        guardada: true
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[Cartas Controller] Erro ao carimbar carta:', error);
    return res.status(500).json({ error: 'Unable to stamp the letter.' });
  } finally {
    if (connection) connection.release();
  }
}

// 5. Remover carimbo / retirar carta da caixa de memórias
async function descarimbarCarta(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM carta_favoritos WHERE usuario_id = ? AND carta_id = ?',
      [usuarioId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Esta carta não estava guardada na sua caixa de memórias.' });
    }

    sendLog('CARTA_REMOVIDA_CAIXA', req, {
      carta_id: Number(id)
    });

    return res.json({ message: 'Carta removida da sua caixa de memórias.' });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao descarimbar carta:', error);
    return res.status(500).json({ error: 'Erro ao remover carta da caixa.' });
  }
}

// 6. Listar cartas guardadas pelo usuário autenticado
async function listarCartasGuardadas(req, res) {
  try {
    const usuarioId = req.usuarioId;

    const [rows] = await pool.query(
      `SELECT 
        c.id,
        c.titulo,
        c.conteudo,
        c.remetente_anonimo,
        c.destinatario_anonimo,
        c.categoria,
        c.tipo_papel,
        c.selo_url,
        c.lacre_cera_cor,
        c.data_carta,
        cf.tipo_carimbo,
        cf.criado_em as guardada_em
       FROM carta_favoritos cf
       JOIN cartas c ON c.id = cf.carta_id
       WHERE cf.usuario_id = ?
         AND ${ACCESSIBLE_LETTER_CONDITION}
       ORDER BY cf.criado_em DESC`,
      [usuarioId, usuarioId, usuarioId]
    );

    return res.json({
      total: rows.length,
      cartas_guardadas: rows.map(c => ({
        ...c,
        guardada: true,
        trecho: c.conteudo.length > 180 ? c.conteudo.substring(0, 180) + '...' : c.conteudo
      }))
    });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao listar guardadas:', error);
    return res.status(500).json({ error: 'Erro ao carregar sua caixa de memórias.' });
  }
}

// 7. Listar categorias disponíveis com totalizador
async function obterCategorias(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.categoria, COUNT(*) as total 
       FROM cartas c
       WHERE ${PUBLIC_ARCHIVE_CONDITION}
       GROUP BY c.categoria 
       ORDER BY total DESC`
    );

    const categoriasConfig = {
      amor: { nome: 'Cartas de Amor', descricao: 'Afetos sinceros, declarações e amores de estação' },
      desabafo: { nome: 'Desabafos', descricao: 'O peso do peito colocado em palavras' },
      nunca_enviada: { nome: 'Nunca Enviadas', descricao: 'Cartas que permaneceram no fundo da gaveta' },
      memorias: { nome: 'Memórias & Infância', descricao: 'Lembranças da casa dos avós e tempos dourados' },
      luto: { nome: 'Despedidas & Luto', descricao: 'Palavras de saudade para quem partiu' },
      confissao: { nome: 'Confissões Secretas', descricao: 'Verdades ditas sob a proteção do anonimato' }
    };

    const formatadas = rows.map(r => ({
      slug: r.categoria,
      nome: (categoriasConfig[r.categoria] && categoriasConfig[r.categoria].nome) || r.categoria,
      descricao: (categoriasConfig[r.categoria] && categoriasConfig[r.categoria].descricao) || '',
      total: r.total
    }));

    return res.json({ categorias: formatadas });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao listar categorias:', error);
    return res.status(500).json({ error: 'Erro ao listar categorias.' });
  }
}

// 8. Adicionar nota marginal / bilhete na carta
async function adicionarNotaCarta(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const { id } = req.params;
    const { texto } = req.body;

    if (!texto || !texto.trim()) {
      return res.status(400).json({ error: 'Note text is required.' });
    }

    const [cartaRows] = await pool.query(
      `SELECT c.id FROM cartas c WHERE c.id = ? AND ${ACCESSIBLE_LETTER_CONDITION}`,
      [id, usuarioId, usuarioId]
    );
    if (cartaRows.length === 0) {
      return res.status(404).json({ error: 'Letter not found in the archive.' });
    }

    const [result] = await pool.query(
      'INSERT INTO notas_cartas (carta_id, usuario_id, texto) VALUES (?, ?, ?)',
      [id, usuarioId, texto.trim()]
    );

    sendLog('NOTA_ADICIONADA', req, {
      carta_id: Number(id),
      nota_id: result.insertId
    });

    return res.status(201).json({
      message: 'Bilhete anexado à carta com sucesso!',
      nota: {
        id: result.insertId,
        carta_id: Number(id),
        texto: texto.trim(),
        criado_em: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao adicionar nota:', error);
    return res.status(500).json({ error: 'Erro ao anexar bilhete.' });
  }
}

// 9. Listar páginas/cartas criadas pelo usuário autenticado (Meu Diário)
async function listarMinhasCartas(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const [rows] = await pool.query(
      `SELECT * FROM cartas WHERE usuario_id = ? ORDER BY criado_em DESC`,
      [usuarioId]
    );

    return res.json({
      total: rows.length,
      cartas: rows.map(c => ({
        ...c,
        trecho: c.conteudo.length > 200 ? c.conteudo.substring(0, 200) + '...' : c.conteudo
      }))
    });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao listar cartas do usuário:', error);
    return res.status(500).json({ error: 'Unable to load your archived letters.' });
  }
}

// 10. Atualizar carta do próprio autor autenticado
async function atualizarMinhaCarta(req, res) {
  let connection;
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';
    const { id } = req.params;
    const {
      titulo,
      conteudo,
      destinatario_anonimo,
      remetente_anonimo,
      categoria,
      tipo_papel,
      pasta_client_id,
      pasta_nome,
      fonte,
      status_carta,
      tema_carta,
      favoritado,
      na_lixeira
    } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'Letter title is required.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT id, conteudo, destinatario_anonimo, remetente_anonimo, categoria, tipo_papel, pasta_client_id, pasta_nome, fonte, status_carta, tema_carta, favoritado, na_lixeira FROM cartas WHERE id = ? AND usuario_id = ? FOR UPDATE',
      [id, usuarioId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Letter not found for this account.' });
    }

    const existing = rows[0];
    const nextConteudo = conteudo !== undefined ? String(conteudo).trim() : existing.conteudo;
    const nextDestinatario = destinatario_anonimo !== undefined ? (destinatario_anonimo ? destinatario_anonimo.trim() : null) : existing.destinatario_anonimo;
    const nextRemetente = remetente_anonimo !== undefined ? (remetente_anonimo ? remetente_anonimo.trim() : 'Anonymous') : existing.remetente_anonimo;
    const nextCategoria = categoria || existing.categoria;
    const nextPapel = tipo_papel || existing.tipo_papel;
    const nextPastaId = pasta_client_id !== undefined ? pasta_client_id : existing.pasta_client_id;
    const nextPastaNome = pasta_nome !== undefined ? pasta_nome : existing.pasta_nome;
    const nextFonte = fonte || existing.fonte;
    const nextStatus = status_carta || existing.status_carta;
    const nextTema = tema_carta !== undefined ? tema_carta : existing.tema_carta;
    const nextFav = favoritado !== undefined ? (Boolean(favoritado) ? 1 : 0) : existing.favoritado;
    const nextLixeira = na_lixeira !== undefined ? (Boolean(na_lixeira) ? 1 : 0) : existing.na_lixeira;

    const isRestoringFromTrash = Boolean(existing.na_lixeira) && !Boolean(nextLixeira);
    if (isRestoringFromTrash) {
      const quota = await enforceActiveLetterQuota(connection, usuarioId, papelUsuario);
      if (!quota.allowed) {
        await connection.rollback();
        return res.status(403).json({
          error: quota.isPremium
            ? `You have reached the limit of ${quota.limiteCartas} archived letters on the Premium Plan.`
            : `You have reached the limit of ${quota.limiteCartas} letters on the Standard Plan. Join Pro Club to restore more letters!`,
          isLimitReached: true,
          limite: quota.limiteCartas,
          upgradeToPremium: !quota.isPremium
        });
      }
    }

    await connection.query(
      `UPDATE cartas
       SET titulo = ?, conteudo = ?, destinatario_anonimo = ?, remetente_anonimo = ?, categoria = ?, tipo_papel = ?,
           pasta_client_id = ?, pasta_nome = ?, fonte = ?, status_carta = ?, tema_carta = ?, favoritado = ?, na_lixeira = ?
       WHERE id = ? AND usuario_id = ?`,
      [
        titulo.trim(),
        nextConteudo,
        nextDestinatario,
        nextRemetente,
        nextCategoria,
        nextPapel,
        nextPastaId,
        nextPastaNome,
        nextFonte,
        nextStatus,
        nextTema,
        nextFav,
        nextLixeira,
        id,
        usuarioId
      ]
    );

    await connection.commit();

    return res.json({
      message: 'Letter updated successfully.',
      carta: {
        id: Number(id),
        titulo: titulo.trim(),
        conteudo: nextConteudo,
        destinatario_anonimo: nextDestinatario,
        remetente_anonimo: nextRemetente,
        categoria: nextCategoria,
        tipo_papel: nextPapel,
        pasta_client_id: nextPastaId,
        pasta_nome: nextPastaNome,
        fonte: nextFonte,
        status_carta: nextStatus,
        tema_carta: nextTema,
        favoritado: Boolean(nextFav),
        na_lixeira: Boolean(nextLixeira)
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[Cartas Controller] Erro ao atualizar carta:', error);
    return res.status(500).json({ error: 'Unable to update the letter.' });
  } finally {
    if (connection) connection.release();
  }
}

// 10.1 Mover para lixeira / restaurar carta do usuário autenticado
async function atualizarLixeiraCarta(req, res) {
  let connection;
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';
    const { id } = req.params;
    const naLixeira = Boolean(req.body?.na_lixeira) ? 1 : 0;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT id, na_lixeira FROM cartas WHERE id = ? AND usuario_id = ? FOR UPDATE',
      [id, usuarioId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Letter not found for this account.' });
    }

    const isRestoringFromTrash = Boolean(rows[0].na_lixeira) && !Boolean(naLixeira);
    if (isRestoringFromTrash) {
      const quota = await enforceActiveLetterQuota(connection, usuarioId, papelUsuario);
      if (!quota.allowed) {
        await connection.rollback();
        return res.status(403).json({
          error: quota.isPremium
            ? `You have reached the limit of ${quota.limiteCartas} archived letters on the Premium Plan.`
            : `You have reached the limit of ${quota.limiteCartas} letters on the Standard Plan. Join Pro Club to restore more letters!`,
          isLimitReached: true,
          limite: quota.limiteCartas,
          upgradeToPremium: !quota.isPremium
        });
      }
    }

    await connection.query(
      'UPDATE cartas SET na_lixeira = ? WHERE id = ? AND usuario_id = ?',
      [naLixeira, id, usuarioId]
    );

    await connection.commit();

    return res.json({ message: naLixeira ? 'Letter moved to trash.' : 'Letter restored from trash.', na_lixeira: Boolean(naLixeira) });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[Cartas Controller] Erro ao atualizar lixeira:', error);
    return res.status(500).json({ error: 'Unable to update letter discard status.' });
  } finally {
    if (connection) connection.release();
  }
}

// 11. Excluir carta do próprio autor autenticado
async function excluirMinhaCarta(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM cartas WHERE id = ? AND usuario_id = ?',
      [id, usuarioId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Letter not found for this account.' });
    }

    return res.json({ message: 'Letter deleted permanently.' });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao excluir carta:', error);
    return res.status(500).json({ error: 'Unable to delete the letter.' });
  }
}

module.exports = {
  listarCartas,
  obterCartaPorId,
  criarCarta,
  carimbarCarta,
  descarimbarCarta,
  listarCartasGuardadas,
  listarMinhasCartas,
  atualizarMinhaCarta,
  atualizarLixeiraCarta,
  excluirMinhaCarta,
  obterCategorias,
  adicionarNotaCarta
};

