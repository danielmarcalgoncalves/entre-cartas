/**
 * profileController.js
 * Manages authenticated user profile and MinIO profile photograph storage.
 *
 * Anti-IDOR Defense:
 *   All operations strictly use req.usuarioId injected by authMiddleware (validated
 *   against MariaDB), never trusting client-supplied IDs.
 */

const { pool } = require('../config/database');
const { uploadFile, getFileStream, deleteFile } = require('../services/minioClient');
const { sendLog } = require('../services/logClient');

/**
 * GET /api/profile
 * Returns full profile data of the currently authenticated user.
 */
async function getProfile(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, nome, email, papel, foto_url, bio, onboarding_concluido, criado_em FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    return res.json({ usuario: rows[0] });
  } catch (err) {
    console.error('[profileController] getProfile error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve profile data.' });
  }
}

/**
 * PUT /api/profile
 * Updates name, bio, and onboarding status of the authenticated user.
 */
async function updateProfile(req, res) {
  try {
    const targetParamId = req.params.id ? Number(req.params.id) : null;
    if (targetParamId && targetParamId !== req.usuarioId) {
      sendLog('BLOQUEIO_IDOR_403', req, {
        motivo: 'Unauthorized profile edit attempt via URL parameter',
        usuarioAutenticado: req.usuarioId,
        usuarioAlvo: targetParamId
      });
      return res.status(403).json({
        error: 'Access denied (403 Forbidden - Anti-IDOR). You do not have permission to modify another user profile.',
        codigo: 'IDOR_BLOCK',
        usuarioAutenticado: req.usuarioId,
        tentativaId: targetParamId
      });
    }

    const targetBodyId = req.body.usuario_id || req.body.id;
    if (targetBodyId && Number(targetBodyId) !== req.usuarioId) {
      sendLog('BLOQUEIO_IDOR_403', req, {
        motivo: 'Unauthorized profile edit attempt via JSON body',
        usuarioAutenticado: req.usuarioId,
        usuarioAlvo: Number(targetBodyId)
      });
      return res.status(403).json({
        error: 'Access denied (403 Forbidden - Anti-IDOR). You do not have permission to modify another user profile.',
        codigo: 'IDOR_BLOCK',
        usuarioAutenticado: req.usuarioId,
        tentativaId: Number(targetBodyId)
      });
    }

    const { nome, bio, onboarding_concluido } = req.body;

    if (!nome && bio === undefined && onboarding_concluido === undefined) {
      return res.status(400).json({ error: 'No fields provided for profile update.' });
    }

    const fields = [];
    const values = [];

    if (nome) {
      if (typeof nome !== 'string' || nome.trim().length < 2) {
        return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      }
      fields.push('nome = ?');
      values.push(nome.trim().slice(0, 100));
    }

    if (bio !== undefined) {
      fields.push('bio = ?');
      values.push(bio ? bio.trim().slice(0, 500) : null);
    }

    if (onboarding_concluido !== undefined) {
      fields.push('onboarding_concluido = ?');
      values.push(Boolean(onboarding_concluido) ? 1 : 0);
    }

    values.push(req.usuarioId);
    await pool.query('UPDATE usuarios SET ' + fields.join(', ') + ' WHERE id = ?', values);

    const [rows] = await pool.query(
      'SELECT id, nome, email, papel, foto_url, bio, onboarding_concluido FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );

    sendLog('PERFIL_ATUALIZADO', req, { usuario_id: req.usuarioId });
    return res.json({ message: 'Profile updated successfully.', usuario: rows[0] });
  } catch (err) {
    console.error('[profileController] updateProfile error:', err.message);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
}

const MAX_CONCURRENT_AVATAR_UPLOADS = 4;
let activeAvatarUploads = 0;

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

/**
 * POST /api/profile/avatar
 * Receives multipart image upload, stores in MinIO, updates DB, and returns new URL and user profile.
 */
async function uploadAvatar(req, res) {
  if (activeAvatarUploads >= MAX_CONCURRENT_AVATAR_UPLOADS) {
    return res.status(503).json({ error: 'Too many concurrent image uploads. Please try again in a moment.' });
  }
  activeAvatarUploads += 1;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded. Please select an image using the "avatar" field.' });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    // 5 MB limit
    if (size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image file too large. Maximum size allowed is 5 MB.' });
    }

    // Accept only JPEG, PNG, and WebP (MIME + magic-byte signature)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimetype) || !hasValidImageMagicBytes(buffer, mimetype)) {
      return res.status(400).json({ error: 'Invalid image format. Please upload JPEG, PNG, or WebP.' });
    }

    sendLog('AVATAR_UPLOAD_START', req, {
      usuario_id: req.usuarioId,
      size,
      mimetype
    });

    // Fetch existing photo reference before upload
    const [existingRows] = await pool.query('SELECT foto_url FROM usuarios WHERE id = ?', [req.usuarioId]);
    const urlAntiga = existingRows[0]?.foto_url;

    // 1. Upload new photo to MinIO storage
    const { objectName, url } = await uploadFile(buffer, originalname, mimetype, req.usuarioId);

    // 2. Persist updated image reference in MariaDB
    await pool.query('UPDATE usuarios SET foto_url = ? WHERE id = ?', [url, req.usuarioId]);

    // 3. Remove old photo from MinIO only after new one is successfully stored
    if (urlAntiga) {
      const match = urlAntiga.match(/usuario-\d+-\d+\.[a-zA-Z0-9]+/);
      if (match) {
        deleteFile('avatar/' + match[0]).catch(delErr => {
          console.warn('[profileController] Could not clean up previous avatar:', delErr.message);
        });
      }
    }

    // 4. Retrieve complete updated user profile for synchronized frontend state
    const [updatedRows] = await pool.query(
      'SELECT id, nome, email, papel, foto_url, bio, onboarding_concluido FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );

    sendLog('AVATAR_ATUALIZADO', req, { usuario_id: req.usuarioId, foto_url: url, objectName });

    return res.json({
      message: 'Profile photograph updated successfully.',
      foto_url: url,
      usuario: updatedRows[0] || null
    });
  } catch (err) {
    console.error('[profileController] uploadAvatar error:', err.message);
    sendLog('AVATAR_UPLOAD_ERRO', req, { usuario_id: req.usuarioId, error: err.message });
    return res.status(500).json({ error: 'Failed to upload photograph: ' + (err.message || 'Internal error.') });
  } finally {
    activeAvatarUploads = Math.max(0, activeAvatarUploads - 1);
  }
}

/**
 * GET /api/profile/avatar/:filename
 * Streams user profile photo directly from MinIO with secure cache headers.
 */
async function getAvatar(req, res) {
  try {
    const filename = req.params.filename;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).send('Invalid filename.');
    }

    const objectName = 'avatar/' + filename;
    const stream = await getFileStream(objectName);

    if (filename.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filename.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else {
      res.setHeader('Content-Type', 'image/jpeg');
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');
    stream.pipe(res);
  } catch (err) {
    return res.status(404).send('Profile photograph not found.');
  }
}

module.exports = { getProfile, updateProfile, uploadAvatar, getAvatar };
