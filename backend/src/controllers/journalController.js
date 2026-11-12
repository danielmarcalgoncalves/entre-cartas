/**
 * journalController.js
 * Manages authenticated personal journals (cadernos + pages JSON) and
 * correspondence folders (pastas_cartas) in MariaDB.
 *
 * Security & Isolation:
 *   All queries strictly filter by req.usuarioId injected from authMiddleware.
 */

const { pool } = require('../config/database');
const { sendLog } = require('../services/logClient');

// =========================================================================
// 1. LIST USER NOTEBOOKS (GET /api/journal/notebooks)
// =========================================================================
async function listNotebooks(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const [rows] = await pool.query(
      `SELECT id, client_id, nome, cor_capa, paginas_json, criado_em, atualizado_em
       FROM cadernos
       WHERE usuario_id = ?
       ORDER BY criado_em ASC`,
      [usuarioId]
    );

    const notebooks = rows.map((r) => {
      let paginas = [];
      try {
        const parsed = JSON.parse(r.paginas_json || '[]');
        if (Array.isArray(parsed)) paginas = parsed;
      } catch {}

      return {
        id: r.client_id,
        remote_db_id: r.id,
        nome: r.nome,
        corCapa: r.cor_capa || 'marrom',
        paginas,
        criadoEm: r.criado_em ? new Date(r.criado_em).toISOString() : undefined,
        atualizadoEm: r.atualizado_em ? new Date(r.atualizado_em).toISOString() : undefined,
        ownerId: usuarioId,
      };
    });

    return res.json({ notebooks });
  } catch (err) {
    console.error('[journalController] listNotebooks error:', err.message);
    return res.status(500).json({ error: 'Unable to retrieve your journals from the archive.' });
  }
}

// =========================================================================
// 2. UPSERT USER NOTEBOOK (PUT /api/journal/notebooks/:clientId)
// =========================================================================
async function upsertNotebook(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';
    const clientId = String(req.params.clientId || '').trim().slice(0, 120);
    const { nome, corCapa = 'marrom', paginas = [] } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Journal identifier is required.' });
    }
    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: 'Journal title is required.' });
    }

    const safePages = Array.isArray(paginas) ? paginas : [];
    const pagesJson = JSON.stringify(safePages);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [userRows] = await conn.query('SELECT id, papel FROM usuarios WHERE id = ? FOR UPDATE', [usuarioId]);
      const papelEfetivo = (userRows[0] && userRows[0].papel) || papelUsuario;

      const [existing] = await conn.query(
        'SELECT id FROM cadernos WHERE usuario_id = ? AND client_id = ? FOR UPDATE',
        [usuarioId, clientId]
      );

      if (existing.length === 0) {
        const isPro = papelEfetivo === 'premium' || papelEfetivo === 'admin';
        const limit = isPro ? 10 : 3;
        const [countRows] = await conn.query(
          'SELECT COUNT(*) as total FROM cadernos WHERE usuario_id = ?',
          [usuarioId]
        );
        const total = countRows[0] ? countRows[0].total : 0;
        if (total >= limit) {
          await conn.rollback();
          return res.status(403).json({
            error: isPro
              ? `You have reached the limit of ${limit} journals on the Premium Plan.`
              : `You have reached the limit of ${limit} journals on the Standard Plan. Join Pro Club for up to 10 journals!`,
            isLimitReached: true,
            limite: limit,
          });
        }

        await conn.query(
          `INSERT INTO cadernos (client_id, usuario_id, nome, cor_capa, paginas_json)
           VALUES (?, ?, ?, ?, ?)`,
          [clientId, usuarioId, String(nome).trim().slice(0, 120), String(corCapa).slice(0, 30), pagesJson]
        );
      } else {
        await conn.query(
          `UPDATE cadernos
           SET nome = ?, cor_capa = ?, paginas_json = ?
           WHERE usuario_id = ? AND client_id = ?`,
          [String(nome).trim().slice(0, 120), String(corCapa).slice(0, 30), pagesJson, usuarioId, clientId]
        );
      }

      await conn.commit();
      return res.json({ message: 'Journal saved.', id: clientId });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[journalController] upsertNotebook error:', err.message);
    return res.status(500).json({ error: 'Failed to save journal to database.' });
  }
}

// =========================================================================
// 3. DELETE USER NOTEBOOK (DELETE /api/journal/notebooks/:clientId)
// =========================================================================
async function deleteNotebook(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const clientId = String(req.params.clientId || '').trim();

    const [result] = await pool.query(
      'DELETE FROM cadernos WHERE usuario_id = ? AND client_id = ?',
      [usuarioId, clientId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Journal not found for this account.' });
    }

    sendLog('CADERNO_EXCLUIDO', req, { usuario_id: usuarioId, client_id: clientId });
    return res.json({ message: 'Journal removed.' });
  } catch (err) {
    console.error('[journalController] deleteNotebook error:', err.message);
    return res.status(500).json({ error: 'Failed to delete journal.' });
  }
}

// =========================================================================
// 4. LIST USER LETTER FOLDERS (GET /api/journal/folders)
// =========================================================================
async function listFolders(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const [rows] = await pool.query(
      `SELECT id, client_id, nome, cor, criado_em
       FROM pastas_cartas
       WHERE usuario_id = ?
       ORDER BY criado_em ASC`,
      [usuarioId]
    );

    const folders = rows.map((r) => ({
      id: r.client_id,
      remote_db_id: r.id,
      nome: r.nome,
      cor: r.cor || 'marrom',
      criadoEm: r.criado_em ? new Date(r.criado_em).toISOString() : new Date().toISOString(),
      ownerId: usuarioId,
    }));

    return res.json({ folders });
  } catch (err) {
    console.error('[journalController] listFolders error:', err.message);
    return res.status(500).json({ error: 'Unable to load correspondence folders.' });
  }
}

// =========================================================================
// 5. UPSERT LETTER FOLDER (PUT /api/journal/folders/:clientId)
// =========================================================================
async function upsertFolder(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';
    const clientId = String(req.params.clientId || '').trim().slice(0, 120);
    const { nome, cor = 'marrom' } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Folder identifier is required.' });
    }
    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: 'Folder name is required.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [userRows] = await conn.query('SELECT id, papel FROM usuarios WHERE id = ? FOR UPDATE', [usuarioId]);
      const papelEfetivo = (userRows[0] && userRows[0].papel) || papelUsuario;

      const [existing] = await conn.query(
        'SELECT id FROM pastas_cartas WHERE usuario_id = ? AND client_id = ? FOR UPDATE',
        [usuarioId, clientId]
      );

      if (existing.length === 0) {
        const isPro = papelEfetivo === 'premium' || papelEfetivo === 'admin';
        const limit = isPro ? 10 : 3;
        const [countRows] = await conn.query(
          'SELECT COUNT(*) as total FROM pastas_cartas WHERE usuario_id = ?',
          [usuarioId]
        );
        const total = countRows[0] ? countRows[0].total : 0;
        if (total >= limit) {
          await conn.rollback();
          return res.status(403).json({
            error: isPro
              ? `You have reached the limit of ${limit} folders on the Premium Plan.`
              : `You have reached the limit of ${limit} folders on the Standard Plan. Join Pro Club for up to 10 folders!`,
            isLimitReached: true,
            limite: limit,
          });
        }

        await conn.query(
          `INSERT INTO pastas_cartas (client_id, usuario_id, nome, cor) VALUES (?, ?, ?, ?)`,
          [clientId, usuarioId, String(nome).trim().slice(0, 120), String(cor).slice(0, 30)]
        );
      } else {
        await conn.query(
          `UPDATE pastas_cartas SET nome = ?, cor = ? WHERE usuario_id = ? AND client_id = ?`,
          [String(nome).trim().slice(0, 120), String(cor).slice(0, 30), usuarioId, clientId]
        );
        await conn.query(
          `UPDATE cartas SET pasta_nome = ? WHERE usuario_id = ? AND pasta_client_id = ?`,
          [String(nome).trim().slice(0, 120), usuarioId, clientId]
        );
      }

      await conn.commit();
      return res.json({ message: 'Folder saved.', id: clientId });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[journalController] upsertFolder error:', err.message);
    return res.status(500).json({ error: 'Failed to save folder.' });
  }
}

// =========================================================================
// 6. DELETE LETTER FOLDER (DELETE /api/journal/folders/:clientId)
// =========================================================================
async function deleteFolder(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const clientId = String(req.params.clientId || '').trim();

    await pool.query(
      'DELETE FROM pastas_cartas WHERE usuario_id = ? AND client_id = ?',
      [usuarioId, clientId]
    );
    await pool.query(
      'UPDATE cartas SET pasta_client_id = NULL, pasta_nome = NULL WHERE usuario_id = ? AND pasta_client_id = ?',
      [usuarioId, clientId]
    );

    return res.json({ message: 'Folder removed.' });
  } catch (err) {
    console.error('[journalController] deleteFolder error:', err.message);
    return res.status(500).json({ error: 'Failed to delete folder.' });
  }
}

module.exports = {
  listNotebooks,
  upsertNotebook,
  deleteNotebook,
  listFolders,
  upsertFolder,
  deleteFolder,
};
