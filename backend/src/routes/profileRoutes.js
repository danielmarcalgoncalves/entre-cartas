/**
 * profileRoutes.js
 * Rotas de perfil de usuario — protegidas por authMiddleware (JWT + DB).
 *
 * POST /api/profile/avatar usa multer com storage em memoria (memoryStorage):
 *   - Arquivo nunca toca o disco do servidor; vai direto do buffer para o MinIO
 *   - Limite de 10 MB no nivel do multer (a validacao real de 5 MB fica no controller)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware } = require('../middlewares/auth');
const { getProfile, updateProfile, uploadAvatar, getAvatar } = require('../controllers/profileController');

const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Multer: guarda o arquivo na memoria (Buffer) com limite estrito de 5 MB e validacao de MIME antes do buffering
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      const err = new Error('Invalid image format. Please upload JPEG, PNG, or WebP.');
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  }
});

function handleAvatarUploadMiddleware(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image file too large. Maximum size allowed is 5 MB.' });
    }
    return res.status(err.statusCode || 400).json({ error: err.message || 'Invalid file upload.' });
  });
}

// GET  /api/profile/avatar/:filename — streaming público da foto salva no MinIO
router.get('/avatar/:filename', getAvatar);

// GET  /api/profile                  — retorna dados do perfil do usuario logado
router.get('/', authMiddleware, getProfile);

// PUT  /api/profile                  — atualiza nome e/ou bio
// PUT  /api/profile/:id              — tentativa de IDOR explicitamente bloqueada
router.put('/', authMiddleware, updateProfile);
router.put('/:id', authMiddleware, updateProfile);

// POST /api/profile/avatar           — upload de foto (campo multipart: "avatar")
router.post('/avatar', authMiddleware, handleAvatarUploadMiddleware, uploadAvatar);

module.exports = router;
