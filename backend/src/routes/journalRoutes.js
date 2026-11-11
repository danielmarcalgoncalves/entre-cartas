const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
const { authMiddleware } = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/notebooks', journalController.listNotebooks);
router.put('/notebooks/:clientId', journalController.upsertNotebook);
router.delete('/notebooks/:clientId', journalController.deleteNotebook);

router.get('/folders', journalController.listFolders);
router.put('/folders/:clientId', journalController.upsertFolder);
router.delete('/folders/:clientId', journalController.deleteFolder);

module.exports = router;
