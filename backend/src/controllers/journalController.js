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
const {
  uploadJournalMedia,
  getJournalMediaStream,
  deleteJournalMedia,
} = require('../services/minioClient');

const MAX_CONCURRENT_JOURNAL_UPLOADS = 4;
let activeJournalUploads = 0;

function hasValidImageMagicBytes(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (mimetype === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimetype === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

function extractAttachmentObjectKeys(paginas, usuarioId) {
  const keys = new Set();
  const prefix = `journal/${Number(usuarioId)}/`;
  if (!Array.isArray(paginas)) return keys;
  for (const page of paginas) {
    if (!page || !Array.isArray(page.attachments)) continue;
    for (const att of page.attachments) {
      if (att && typeof att.objectKey === 'string' && att.objectKey.startsWith(prefix)) {
        keys.add(att.objectKey);
      }
    }
  }
  return keys;
}

function containsDisallowedBase64Media(paginas) {
  if (!Array.isArray(paginas)) return false;
  for (const page of paginas) {
    if (!page || !Array.isArray(page.attachments)) continue;
    for (const att of page.attachments) {
      if (!att) continue;
      if (typeof att.url === 'string' && att.url.trim().toLowerCase().startsWith('data:')) {
        return true;
      }
      if (typeof att.objectKey === 'string' && att.objectKey.trim().toLowerCase().startsWith('data:')) {
        return true;
      }
    }
  }
  return false;
}

async function cleanupUnusedJournalMedia(usuarioId, candidateKeys) {
  if (!candidateKeys || candidateKeys.size === 0) return;
  try {
    const [rows] = await pool.query(
      'SELECT paginas_json FROM cadernos WHERE usuario_id = ?',
      [usuarioId]
    );
    const stillReferenced = new Set();
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.paginas_json || '[]');
        for (const k of extractAttachmentObjectKeys(parsed, usuarioId)) {
          stillReferenced.add(k);
        }
      } catch {}
    }
    for (const key of candidateKeys) {
      if (!stillReferenced.has(key)) {
        await deleteJournalMedia(key);
      }
    }
  } catch (err) {
    console.warn('[journalController] Media cleanup deferred:', err.message);
  }
}

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
    if (containsDisallowedBase64Media(safePages)) {
      return res.status(400).json({ error: 'Embedded Base64 image data is not permitted in journal pages.' });
    }
    const pagesJson = JSON.stringify(safePages);
    let removedKeys = new Set();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [userRows] = await conn.query('SELECT id, papel FROM usuarios WHERE id = ? FOR UPDATE', [usuarioId]);
      const papelEfetivo = (userRows[0] && userRows[0].papel) || papelUsuario;

      const [existing] = await conn.query(
        'SELECT id, paginas_json FROM cadernos WHERE usuario_id = ? AND client_id = ? FOR UPDATE',
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
        let prevPages = [];
        try {
          prevPages = JSON.parse(existing[0].paginas_json || '[]');
        } catch {}
        const prevKeys = extractAttachmentObjectKeys(prevPages, usuarioId);
        const nextKeys = extractAttachmentObjectKeys(safePages, usuarioId);
        for (const k of prevKeys) {
          if (!nextKeys.has(k)) removedKeys.add(k);
        }

        await conn.query(
          `UPDATE cadernos
           SET nome = ?, cor_capa = ?, paginas_json = ?
           WHERE usuario_id = ? AND client_id = ?`,
          [String(nome).trim().slice(0, 120), String(corCapa).slice(0, 30), pagesJson, usuarioId, clientId]
        );
      }

      await conn.commit();
      if (removedKeys.size > 0) {
        await cleanupUnusedJournalMedia(usuarioId, removedKeys);
      }
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

    const [rows] = await pool.query(
      'SELECT paginas_json FROM cadernos WHERE usuario_id = ? AND client_id = ? LIMIT 1',
      [usuarioId, clientId]
    );

    const [result] = await pool.query(
      'DELETE FROM cadernos WHERE usuario_id = ? AND client_id = ?',
      [usuarioId, clientId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Journal not found for this account.' });
    }

    if (rows[0]?.paginas_json) {
      try {
        const parsed = JSON.parse(rows[0].paginas_json || '[]');
        const candidateKeys = extractAttachmentObjectKeys(parsed, usuarioId);
        if (candidateKeys.size > 0) {
          await cleanupUnusedJournalMedia(usuarioId, candidateKeys);
        }
      } catch {}
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

// =========================================================================
// 7. UPLOAD JOURNAL PHOTOGRAPH (POST /api/journal/notebooks/:clientId/media)
// =========================================================================
async function uploadJournalPhoto(req, res) {
  if (activeJournalUploads >= MAX_CONCURRENT_JOURNAL_UPLOADS) {
    return res.status(503).json({ error: 'Too many concurrent image uploads. Please try again in a moment.' });
  }
  activeJournalUploads += 1;
  try {
    const usuarioId = req.usuarioId;
    const clientId = String(req.params.clientId || '').trim().slice(0, 120);
    if (!clientId) {
      return res.status(400).json({ error: 'Journal identifier is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded. Please select an image using the "photo" field.' });
    }

    const { buffer, mimetype, size } = req.file;
    if (size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image file too large. Maximum size allowed is 5 MB.' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimetype) || !hasValidImageMagicBytes(buffer, mimetype)) {
      return res.status(400).json({ error: 'Invalid image format. Please upload JPEG, PNG, or WebP.' });
    }

    // Verify ownership if notebook exists in DB (or ensure clientId isn't owned by another account)
    const [nbRows] = await pool.query(
      'SELECT usuario_id FROM cadernos WHERE client_id = ? AND usuario_id = ? LIMIT 1',
      [clientId, usuarioId]
    );
    // Note: uk_usuario_caderno is (usuario_id, client_id); if not yet saved in DB, upload is strictly scoped under journal/<usuarioId>/<clientId>/

    const { objectKey, url } = await uploadJournalMedia(buffer, mimetype, usuarioId, clientId);

    sendLog('JOURNAL_MEDIA_UPLOADED', req, {
      usuario_id: usuarioId,
      notebook_id: clientId,
      objectKey,
      size,
      mimetype
    });

    return res.status(201).json({
      objectKey,
      url,
      mimeType: mimetype,
      size
    });
  } catch (err) {
    console.error('[journalController] uploadJournalPhoto error:', err.message);
    return res.status(500).json({ error: 'Failed to upload journal photograph.' });
  } finally {
    activeJournalUploads = Math.max(0, activeJournalUploads - 1);
  }
}

// =========================================================================
// 8. STREAM PRIVATE JOURNAL PHOTOGRAPH (GET /api/journal/media/:usuarioId/:notebookId/:filename)
// =========================================================================
async function getJournalMedia(req, res) {
  try {
    const reqUserId = Number(req.usuarioId);
    const paramUserId = Number(req.params.usuarioId);
    const notebookId = String(req.params.notebookId || '');
    const filename = String(req.params.filename || '');

    if (!reqUserId || reqUserId !== paramUserId) {
      return res.status(403).json({ error: 'You do not have permission to access this journal photograph.' });
    }

    if (
      !notebookId || !filename ||
      notebookId.includes('..') || notebookId.includes('/') || notebookId.includes('\\') ||
      filename.includes('..') || filename.includes('/') || filename.includes('\\')
    ) {
      return res.status(400).json({ error: 'Invalid media path.' });
    }

    const objectKey = `journal/${paramUserId}/${notebookId}/${filename}`;
    const stream = await getJournalMediaStream(objectKey);

    if (filename.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filename.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    stream.on('error', () => {
      if (!res.headersSent) res.status(404).json({ error: 'Journal photograph not found.' });
    });
    stream.pipe(res);
  } catch (err) {
    return res.status(404).json({ error: 'Journal photograph not found.' });
  }
}

module.exports = {
  listNotebooks,
  upsertNotebook,
  deleteNotebook,
  uploadJournalPhoto,
  getJournalMedia,
  listFolders,
  upsertFolder,
  deleteFolder,
};
