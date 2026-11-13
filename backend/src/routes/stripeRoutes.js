/**
 * stripeRoutes.js
 * Rotas para integração com o Stripe (Plano Premium).
 *
 * IMPORTANTE:
 *   A rota /webhook usa express.raw() para preservar o corpo original da
 *   requisição, necessário para validação da assinatura do Stripe.
 *   Por isso, ela DEVE ser registrada ANTES do express.json() global no server.js.
 *   Aqui, o express.raw() é aplicado apenas para esta rota específica.
 */

const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const { authMiddleware } = require('../middlewares/auth');

/**
 * POST /api/stripe/webhook
 * Recebe eventos assinados do Stripe.
 *
 * NÃO usa authMiddleware (o Stripe chama diretamente).
 * Usa express.raw() para preservar o corpo da requisição intacto (obrigatório para validação).
 * Deve ser registrado ANTES do express.json() global — ver server.js.
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  stripeController.handleWebhook
);

/**
 * POST /api/stripe/checkout
 * Cria uma Checkout Session para o usuário autenticado.
 * Requer autenticação JWT.
 */
router.post('/checkout', express.json(), authMiddleware, stripeController.createCheckoutSession);

/**
 * POST /api/stripe/portal
 * Cria uma sessão no Stripe Billing Portal para o usuário autenticado.
 * Requer autenticação JWT.
 */
router.post('/portal', express.json(), authMiddleware, stripeController.createPortalSession);

/**
 * GET /api/stripe/status
 * Retorna o status da assinatura do usuário autenticado.
 * Requer autenticação JWT.
 */
router.get('/status', authMiddleware, stripeController.getSubscriptionStatus);

module.exports = router;
