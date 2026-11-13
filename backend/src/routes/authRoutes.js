const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, requireAdmin } = require('../middlewares/auth');
const {
  registerLimiter,
  loginLimiter,
  verifyCodeLimiter,
  forgotPasswordLimiter,
  validateRegistrationInput,
  noStoreHeaders
} = require('../middlewares/security');

// Email/Password & OTP Authentication
router.post('/register', registerLimiter, validateRegistrationInput, authController.register);
router.post('/verify-code', verifyCodeLimiter, authController.verifyCode);
router.post('/verify-email', verifyCodeLimiter, authController.verifyCode);
router.post('/resend-code', verifyCodeLimiter, authController.resendCode);
router.post('/resend-verification', verifyCodeLimiter, authController.resendCode);
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);

// Password Recovery & Reset
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.get('/reset-password/validate', authController.validateResetToken);
router.post('/reset-password', forgotPasswordLimiter, authController.resetPassword);

// Google OAuth 2.0
router.get('/google/status', authController.googleAuthStatus);
router.get('/google', authController.googleAuthRedirect);
router.get('/google/callback', authController.googleAuthCallback);

// RBAC Admin Routes
router.get('/users', authMiddleware, requireAdmin, noStoreHeaders, authController.listUsers);
router.patch('/users/:id/role', authMiddleware, requireAdmin, noStoreHeaders, authController.updateUserRole);
router.delete('/users/:id', authMiddleware, requireAdmin, noStoreHeaders, authController.deleteUser);
router.get('/logs', authMiddleware, requireAdmin, noStoreHeaders, authController.getAuditLogs);

module.exports = router;
