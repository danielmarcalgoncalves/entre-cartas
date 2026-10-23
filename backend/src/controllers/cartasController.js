const { pool } = require('../config/database');
const { sendLog } = require('../services/logClient');

/**
 * Controller de Cartas — Entre Cartas
 * Gerencia o acervo epistolar, interações de leitura, carimbos físicos e regras de negócio SaaS.
 */

// 1. Listar cartas com filtros, paginação e indicação de carimbos
async function listarCartas(req, res) {
  try {
    const { categoria, tipo_papel, q, ordem = 'recentes', page = 1, limit = 20 } = req.query;
    const usuarioId = req.usuarioId || null;

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
      WHERE c.status_curadoria = 'aprovada'
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

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);

    // Contagem total para metadados de paginação
    let countQuery = 'SELECT COUNT(*) as total FROM cartas c WHERE c.status_curadoria = "aprovada"';
    const countParams = [];
    if (categoria && categoria !== 'todas') {
      countQuery += ' AND c.categoria = ?';
      countParams.push(categoria);
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
      pagina: parseInt(page, 10),
      limite: parseInt(limit, 10),
      total_paginas: Math.ceil(total / parseInt(limit, 10)),
      cartas: rows.map(c => ({
        ...c,
        guardada: Boolean(c.guardada),
        tipo_carimbo: c.tipo_carimbo || null,
        trecho: c.conteudo.length > 220 ? c.conteudo.substring(0, 220) + '...' : c.conteudo
      }))
    });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao listar cartas:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar o acervo de cartas.' });
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
      WHERE c.id = ?`,
      [usuarioId || 0, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Carta não encontrada no acervo.' });
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
    const usuarioId = req.usuarioId || null;
    const papelUsuario = req.usuarioPapel || 'visitante';
    const {
      titulo,
      conteudo,
      remetente_anonimo,
      destinatario_anonimo,
      categoria = 'desabafo',
      tipo_papel = 'envelhecido',
      lacre_cera_cor = 'vinho',
      data_carta
    } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'O título da carta é obrigatório.' });
    }

    if (!conteudo || !conteudo.trim() || conteudo.trim().length < 20) {
      return res.status(400).json({ error: 'O conteúdo da carta deve ter pelo menos 20 caracteres.' });
    }

    // Regra de cota para usuários do plano gratuito: até 2 cartas/mês
    if (usuarioId && papelUsuario === 'usuario') {
      const [contagemMes] = await pool.query(
        `SELECT COUNT(*) as total FROM cartas 
         WHERE usuario_id = ? AND criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [usuarioId]
      );
      if (contagemMes[0].total >= 2) {
        sendLog('BLOQUEIO_LIMITE_CARTAS_403', req, {
          motivo: 'Limite mensal de 2 cartas atingido para Plano Leitor',
          usuario_id: usuarioId
        });
        return res.status(403).json({
          error: 'Limite de 2 cartas por mês atingido no Plano Leitor. Assine o Clube do Remetente Pro para envios ilimitados!',
          isLimitReached: true,
          upgradeToPremium: true
        });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO cartas (usuario_id, titulo, conteudo, remetente_anonimo, destinatario_anonimo, categoria, tipo_papel, lacre_cera_cor, data_carta, status_curadoria)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aprovada')`,
      [
        usuarioId,
        titulo.trim(),
        conteudo.trim(),
        remetente_anonimo ? remetente_anonimo.trim() : 'Anônimo',
        destinatario_anonimo ? destinatario_anonimo.trim() : null,
        categoria,
        tipo_papel,
        lacre_cera_cor,
        data_carta || 'Hoje'
      ]
    );

    sendLog('CARTA_ENVIADA', req, {
      carta_id: result.insertId,
      titulo,
      categoria,
      papel: papelUsuario
    });

    return res.status(201).json({
      message: 'Carta depositada na caixa de memórias com sucesso!',
      carta: {
        id: result.insertId,
        titulo,
        categoria,
        tipo_papel,
        remetente_anonimo: remetente_anonimo || 'Anônimo'
      }
    });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao criar carta:', error);
    return res.status(500).json({ error: 'Erro ao selar e enviar a carta.' });
  }
}

// 4. Carimbar e guardar carta na caixa de memórias (Regra RBAC Free vs Pro)
async function carimbarCarta(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';
    const { id } = req.params;
    const { tipo_carimbo = 'LIDA' } = req.body;

    const [cartaRows] = await pool.query('SELECT id, titulo, categoria FROM cartas WHERE id = ?', [id]);
    if (cartaRows.length === 0) {
      return res.status(404).json({ error: 'Carta não encontrada para carimbar.' });
    }
    const carta = cartaRows[0];

    // Regra RBAC de Monetização do Entre Cartas:
    // - Plano Leitor (Free / 'usuario'): máximo de 5 cartas guardadas
    // - Clube do Remetente Pro ('premium' ou 'admin'): ILIMITADO
    let limite = null;
    if (papelUsuario === 'usuario') {
      limite = 5;
    }

    if (limite !== null) {
      const [countRows] = await pool.query(
        'SELECT COUNT(*) as total FROM carta_favoritos WHERE usuario_id = ?',
        [usuarioId]
      );
      const totalGuardadas = countRows[0].total;

      const [jaExiste] = await pool.query(
        'SELECT id FROM carta_favoritos WHERE usuario_id = ? AND carta_id = ?',
        [usuarioId, id]
      );

      if (totalGuardadas >= limite && jaExiste.length === 0) {
        sendLog('BLOQUEIO_LIMITE_CARTAS_403', req, {
          motivo: `Limite de ${limite} cartas guardadas atingido no Plano Leitor`,
          carta_id: Number(id),
          titulo: carta.titulo,
          papelAtual: papelUsuario,
          limite
        });

        return res.status(403).json({
          error: `Sua caixa de memórias atingiu o limite de ${limite} cartas guardadas. Assine o Clube do Remetente Pro para colecionar memórias ilimitadas!`,
          isLimitReached: true,
          limite,
          upgradeToPremium: true
        });
      }
    }

    // Insere ou atualiza o tipo de carimbo
    await pool.query(
      `INSERT INTO carta_favoritos (usuario_id, carta_id, tipo_carimbo)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE tipo_carimbo = VALUES(tipo_carimbo)`,
      [usuarioId, id, tipo_carimbo]
    );

    sendLog('CARIMBO_APLICADO', req, {
      carta_id: Number(id),
      titulo: carta.titulo,
      tipo_carimbo,
      papel: papelUsuario
    });

    return res.status(201).json({
      message: `Carta carimbada como "${tipo_carimbo}" e guardada na sua caixa de memórias!`,
      carimbo: {
        carta_id: Number(id),
        tipo_carimbo,
        guardada: true
      }
    });
  } catch (error) {
    console.error('[Cartas Controller] Erro ao carimbar carta:', error);
    return res.status(500).json({ error: 'Erro ao carimbar a carta.' });
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
       ORDER BY cf.criado_em DESC`,
      [usuarioId]
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
      `SELECT categoria, COUNT(*) as total 
       FROM cartas 
       WHERE status_curadoria = 'aprovada' 
       GROUP BY categoria 
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
      return res.status(400).json({ error: 'O texto do bilhete é obrigatório.' });
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
    return res.status(500).json({ error: 'Erro ao carregar suas páginas de diário.' });
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
  obterCategorias,
  adicionarNotaCarta
};

