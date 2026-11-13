const express = require('express');
const multer = require('multer');
const router = express.Router();
const journalController = require('../controllers/journalController');
const { authMiddleware } = require('../middlewares/auth');

const ALLOWED_JOURNAL_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const uploadJournalPhotoMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_JOURNAL_MIME_TYPES.has(file.mimetype)) {
      const err = new Error('Invalid image format. Please upload JPEG, PNG, or WebP.');
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  }
});

function handleJournalPhotoUploadMiddleware(req, res, next) {
  uploadJournalPhotoMulter.single('photo')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image file too large. Maximum size allowed is 5 MB.' });
    }
    return res.status(err.statusCode || 400).json({ error: err.message || 'Invalid file upload.' });
  });
}

router.use(authMiddleware);

router.get('/notebooks', journalController.listNotebooks);
router.put('/notebooks/:clientId', journalController.upsertNotebook);
router.delete('/notebooks/:clientId', journalController.deleteNotebook);
router.post('/notebooks/:clientId/media', handleJournalPhotoUploadMiddleware, journalController.uploadJournalPhoto);
router.get('/media/:usuarioId/:notebookId/:filename', journalController.getJournalMedia);

router.get('/folders', journalController.listFolders);
router.put('/folders/:clientId', journalController.upsertFolder);
router.delete('/folders/:clientId', journalController.deleteFolder);

module.exports = router;
