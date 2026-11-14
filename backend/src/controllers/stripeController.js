/**
 * stripeController.js
 * Integração com o Stripe para o Plano Premium do Catálogo Tom Hanks.
 *
 * Segurança:
 *   - Apenas usuários autenticados podem iniciar o checkout (authMiddleware).
 *   - O webhook valida criptograficamente a assinatura do Stripe (stripe.webhooks.constructEvent).
 *   - O corpo raw da requisição é preservado para validação do webhook.
 *   - O estado premium é atualizado EXCLUSIVAMENTE por eventos confiáveis do Stripe.
 *   - Nenhum dado de cartão é armazenado no banco.
 *   - Idempotência: eventos duplicados não geram inconsistências.
 *
 * Fluxo:
 *   1. POST /api/stripe/checkout → cria Checkout Session → retorna URL
 *   2. Stripe redireciona usuário para page hospedada pelo Stripe
 *   3. POST /api/stripe/webhook → Stripe envia evento assinado → atualiza banco
 *   4. GET  /api/stripe/status  → frontend consulta estado atual da assinatura
 */

const { pool } = require('../config/database');
const { sendLog } = require('../services/logClient');
const {
  resolvePublicAppUrl,
  evaluateUserEntitlement,
} = require('../utils/entitlement');

// Configurações centralizadas do plano (dinâmicas para cada requisição)
function getStripeConfig(req = null) {
  return {
    PRICE_ID: process.env.STRIPE_PRICE_ID || null,
    APP_URL: resolvePublicAppUrl(req),
  };
}

// Inicializa o SDK do Stripe com a chave secreta de TESTE
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY não configurada. Configure a variável de ambiente com a chave de teste sk_test_...');
  }
  if (secretKey.startsWith('sk_live_')) {
    throw new Error('STRIPE_SECRET_KEY de produção detectada. Esta aplicação usa exclusivamente o modo de TESTE do Stripe.');
  }
  const Stripe = require('stripe');
  return new Stripe(secretKey, { apiVersion: '2024-06-20' });
}

/**
 * POST /api/stripe/checkout
 * Cria uma Checkout Session no Stripe em modo de teste para o usuário autenticado.
 * Retorna a URL de checkout hospedada pelo Stripe.
 */
async function createCheckoutSession(req, res) {
  try {
    const stripe = getStripe();
    const config = getStripeConfig(req);

    if (!config.PRICE_ID) {
      return res.status(503).json({
        error: 'O serviço de pagamento ainda não está configurado. Configure STRIPE_PRICE_ID.',
        configuracao: 'Crie um produto "Plano Premium" no painel Stripe em modo de teste e adicione o ID do preço (price_...) à variável de ambiente STRIPE_PRICE_ID.'
      });
    }

    const usuarioId = req.usuarioId;
    const usuario = req.usuario;

    // Verifica se o usuário já é premium/admin (não cria assinatura duplicada)
    if (usuario.papel === 'premium') {
      return res.status(400).json({
        error: 'Você já possui o Plano Premium ativo.',
        isPremium: true
      });
    }
    if (usuario.papel === 'admin') {
      return res.status(400).json({
        error: 'Administradores já possuem acesso completo ao sistema.',
        isAdmin: true
      });
    }

    // Verifica se já existe assinatura ativa no banco para evitar duplicação
    const [existingSubs] = await pool.query(
      'SELECT id, stripe_subscription_id, status FROM stripe_subscriptions WHERE usuario_id = ? AND status IN (?, ?) LIMIT 1',
      [usuarioId, 'active', 'trialing']
    );
    if (existingSubs.length > 0) {
      return res.status(400).json({
        error: 'Você já possui uma assinatura Premium ativa.',
        isPremium: true,
        subscriptionId: existingSubs[0].stripe_subscription_id
      });
    }

    // Serializa criação de customer por usuário para evitar duplicatas concorrentes
    let customerId = null;
    const customerConn = await pool.getConnection();
    try {
      await customerConn.beginTransaction();
      await customerConn.query('SELECT id FROM usuarios WHERE id = ? FOR UPDATE', [usuarioId]);

      const [existingCustomer] = await customerConn.query(
        'SELECT stripe_customer_id FROM stripe_subscriptions WHERE usuario_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1 FOR UPDATE',
        [usuarioId]
      );
      customerId = existingCustomer[0]?.stripe_customer_id || null;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: usuario.email,
          name: usuario.nome,
          metadata: {
            usuario_id: String(usuarioId)
          }
        });
        customerId = customer.id;

        await customerConn.query(
          `INSERT INTO stripe_subscriptions (usuario_id, stripe_customer_id, status)
           VALUES (?, ?, 'inactive')
           ON DUPLICATE KEY UPDATE
             stripe_customer_id = COALESCE(stripe_customer_id, VALUES(stripe_customer_id))`,
          [usuarioId, customerId]
        );
      }

      await customerConn.commit();
    } catch (custErr) {
      await customerConn.rollback();
      throw custErr;
    } finally {
      customerConn.release();
    }

    // Cria a Checkout Session em modo de assinatura mensal
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: config.PRICE_ID,
          quantity: 1
        }
      ],
      // Associa o usuário à sessão (usado na identificação pelo webhook)
      client_reference_id: String(usuarioId),
      metadata: {
        usuario_id: String(usuarioId),
        usuario_email: usuario.email,
        usuario_nome: usuario.nome
      },
      // URLs de retorno após o checkout (hospedadas pelo Stripe)
      success_url: `${config.APP_URL}/clube-pro?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.APP_URL}/clube-pro?checkout=cancel`,
      // Configurações regionais
      locale: 'pt-BR',
      // Permite código de promoção (útil para testes)
      allow_promotion_codes: true
    });

    sendLog('STRIPE_CHECKOUT_CRIADO', req, {
      usuario_id: usuarioId,
      session_id: session.id,
      price_id: config.PRICE_ID
    });

    return res.json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('[stripeController] createCheckoutSession error:', error.message);
    sendLog('STRIPE_CHECKOUT_ERRO', req, {
      usuario_id: req.usuarioId,
      erro: error.message
    });

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Configuração do Stripe inválida: ' + error.message });
    }
    return res.status(500).json({ error: 'Erro ao iniciar o checkout. Tente novamente.' });
  }
}

/**
 * POST /api/stripe/webhook
 * Recebe eventos enviados pelo Stripe (validados criptograficamente).
 *
 * IMPORTANTE: Este endpoint precisa receber o corpo raw (Buffer) da requisição,
 * por isso é configurado ANTES do express.json() global no server.js.
 *
 * Eventos tratados:
 *  - checkout.session.completed   → Assinatura iniciada após checkout
 *  - invoice.paid                 → Pagamento mensal confirmado (renova acesso)
 *  - invoice.payment_failed       → Falha no pagamento (pode suspender acesso)
 *  - customer.subscription.updated → Estado da assinatura mudou
 *  - customer.subscription.deleted → Assinatura cancelada (revoga acesso)
 */
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET não configurado.');
    return res.status(500).json({ error: 'Webhook não configurado.' });
  }

  let event;
  try {
    // Validação criptográfica da assinatura do Stripe
    // req.body deve ser o Buffer raw — configurado via express.raw() na rota
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Assinatura inválida:', err.message);
    return res.status(400).json({ error: 'Assinatura do webhook inválida.' });
  }

  // Idempotência atômica: reivindica o event.id ANTES de processar para evitar corrida
  let claimed = false;
  try {
    await pool.query(
      'INSERT INTO stripe_webhook_events (stripe_event_id, tipo, processado_em) VALUES (?, ?, NOW())',
      [event.id, event.type]
    );
    claimed = true;
  } catch (dbErr) {
    if (dbErr && dbErr.code === 'ER_DUP_ENTRY') {
      console.log(`[Webhook] Evento ${event.id} (${event.type}) já processado ou em processamento. Ignorando.`);
      return res.json({ received: true, idempotent: true });
    }
    console.error('[Webhook] Erro ao reivindicar idempotência:', dbErr.message);
    return res.status(500).json({ error: 'Database error verifying webhook idempotency.' });
  }

  console.log(`[Webhook] Processando evento: ${event.type} (${event.id})`);

  try {
    switch (event.type) {

      // Checkout concluído com sucesso — assinatura recém-criada
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.payment_status === 'paid') {
          await _ativarPremiumPorSessao(session);
        } else if (session.mode === 'subscription' && session.payment_status === 'unpaid') {
          // Assinatura criada mas pagamento pendente (boleto/pix) — persiste vínculo pendente para invoice.paid futuro
          const pendingUserId = session.client_reference_id || session.metadata?.usuario_id;
          if (pendingUserId) {
            await pool.query(
              `INSERT INTO stripe_subscriptions (usuario_id, stripe_customer_id, stripe_subscription_id, status)
               VALUES (?, ?, ?, 'incomplete')
               ON DUPLICATE KEY UPDATE
                 stripe_customer_id = COALESCE(VALUES(stripe_customer_id), stripe_customer_id),
                 stripe_subscription_id = COALESCE(VALUES(stripe_subscription_id), stripe_subscription_id),
                 status = IF(status IN ('active', 'trialing'), status, 'incomplete'),
                 atualizado_em = NOW()`,
              [Number(pendingUserId), session.customer || null, session.subscription || null]
            );
          }
          console.log(`[Webhook] Checkout ${session.id}: aguardando confirmação de pagamento (vinculado como incomplete).`);
        }
        break;
      }

      // Fatura paga — renova ou ativa o acesso premium
      case 'invoice.paid': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await _ativarPremiumPorSubscription(invoice.subscription, invoice.customer);
        }
        break;
      }

      // Falha no pagamento — NÃO revoga acesso imediatamente (Stripe tentará novamente)
      // O cancelamento definitivo vem via customer.subscription.deleted
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn(`[Webhook] Falha de pagamento para assinatura ${invoice.subscription}.`);
        await _registrarFalhaPagamento(invoice);
        break;
      }

      // Estado da assinatura mudou (ex: cancelamento agendado, reativação)
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await _sincronizarSubscription(subscription);
        break;
      }

      // Assinatura cancelada definitivamente — revoga acesso premium
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await _revogarPremium(subscription);
        break;
      }

      default:
        console.log(`[Webhook] Evento não tratado: ${event.type}`);
    }

    return res.json({ received: true });

  } catch (processingError) {
    if (claimed) {
      await pool.query('DELETE FROM stripe_webhook_events WHERE stripe_event_id = ?', [event.id]).catch(() => {});
    }
    console.error(`[Webhook] Erro ao processar evento ${event.type}:`, processingError.message);
    // Retorna 500 para o Stripe tentar novamente (falha transitória)
    return res.status(500).json({ error: 'Erro interno ao processar evento.' });
  }
}

/**
 * GET /api/stripe/status
 * Retorna o estado atual da assinatura do usuário autenticado.
 */
async function getSubscriptionStatus(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const entitlement = await evaluateUserEntitlement(pool, usuarioId);

    if (!entitlement) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const subscription = entitlement.subscription;

    return res.json({
      isPremium: entitlement.isPro,
      papel: entitlement.papel,
      plan: entitlement.plan,
      isPastDue: entitlement.isPastDue,
      billingWarning: entitlement.billingWarning,
      canManageBilling: entitlement.canManageBilling,
      subscription: subscription ? {
        id: subscription.stripe_subscription_id,
        status: subscription.status,
        periodoInicio: subscription.periodo_inicio,
        periodoFim: subscription.periodo_fim,
        atualizadoEm: subscription.atualizado_em
      } : null
    });

  } catch (error) {
    console.error('[stripeController] getSubscriptionStatus error:', error.message);
    return res.status(500).json({ error: 'Erro ao consultar status da assinatura.' });
  }
}

/**
 * POST /api/stripe/portal
 * Cria uma sessão do Stripe Billing Portal para o cliente associado ao usuário autenticado.
 */
async function createPortalSession(req, res) {
  try {
    const stripe = getStripe();
    const config = getStripeConfig(req);
    const usuarioId = req.usuarioId;

    const [subRows] = await pool.query(
      `SELECT stripe_customer_id, stripe_subscription_id, status
       FROM stripe_subscriptions
       WHERE usuario_id = ? AND stripe_customer_id IS NOT NULL
       ORDER BY atualizado_em DESC, criado_em DESC
       LIMIT 1`,
      [usuarioId]
    );

    const customerId = subRows[0]?.stripe_customer_id || null;
    if (!customerId) {
      return res.status(404).json({
        error: 'No Stripe billing profile was found for your account. Subscribe to the Pro Sender Club first to manage billing.'
      });
    }

    // Verify customer ownership on Stripe before creating portal session
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer || customer.deleted) {
        return res.status(404).json({
          error: 'Your Stripe billing profile is no longer active. Please contact support or start a new subscription.'
        });
      }
      if (customer.metadata?.usuario_id && Number(customer.metadata.usuario_id) !== Number(usuarioId)) {
        sendLog('STRIPE_PORTAL_OWNERSHIP_MISMATCH', req, {
          usuario_id: usuarioId,
          customer_id: customerId
        });
        return res.status(403).json({
          error: 'Billing profile ownership verification failed.'
        });
      }
    } catch (custLookupErr) {
      if (custLookupErr.statusCode === 404 || custLookupErr.code === 'resource_missing') {
        return res.status(404).json({
          error: 'Stripe customer record could not be found in the current Stripe environment.'
        });
      }
      throw custLookupErr;
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${config.APP_URL}/clube-pro`
    });

    sendLog('STRIPE_PORTAL_CRIADO', req, {
      usuario_id: usuarioId,
      customer_id: customerId
    });

    return res.json({
      url: portalSession.url
    });
  } catch (error) {
    console.error('[stripeController] createPortalSession error:', error.message);
    sendLog('STRIPE_PORTAL_ERRO', req, {
      usuario_id: req.usuarioId,
      erro: error.message
    });

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'Unable to open the Stripe Billing Portal: ' + error.message
      });
    }
    return res.status(502).json({
      error: 'Unable to connect to the Stripe Billing Portal right now. Please try again shortly.'
    });
  }
}

// ─── Funções Auxiliares Internas ────────────────────────────────────────────

/**
 * Ativa o Premium para o usuário identificado pela Checkout Session.
 */
async function _ativarPremiumPorSessao(session) {
  const usuarioId = session.client_reference_id || session.metadata?.usuario_id;
  if (!usuarioId) {
    console.error('[Webhook] checkout.session.completed sem usuario_id identificável:', session.id);
    return;
  }

  const customerId = session.customer;
  const subscriptionId = session.subscription;

  await _persistirPremium(Number(usuarioId), customerId, subscriptionId, 'active', session);
}

/**
 * Ativa ou renova o Premium para o usuário identificado pelo subscription_id e customer_id do Stripe.
 */
async function _ativarPremiumPorSubscription(subscriptionId, customerId) {
  // Localiza usuário pelo subscription_id ou customer_id na tabela de assinaturas
  const [rows] = await pool.query(
    'SELECT usuario_id FROM stripe_subscriptions WHERE stripe_subscription_id = ? OR stripe_customer_id = ? LIMIT 1',
    [subscriptionId, customerId]
  );

  let usuarioId = rows[0]?.usuario_id || null;

  if (!usuarioId && customerId) {
    try {
      const stripe = getStripe();
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted && customer.metadata?.usuario_id) {
        usuarioId = Number(customer.metadata.usuario_id);
      }
    } catch (lookupErr) {
      console.warn('[Webhook] invoice.paid: fallback customer lookup failed:', lookupErr.message);
    }
  }

  if (!usuarioId) {
    console.warn('[Webhook] invoice.paid: customer/subscription não encontrado no banco:', customerId, subscriptionId);
    return;
  }

  await _persistirPremium(usuarioId, customerId, subscriptionId, 'active', null);
}

/**
 * Persiste o estado Premium no banco: atualiza/insere stripe_subscriptions e muda papel do usuário.
 */
async function _persistirPremium(usuarioId, customerId, subscriptionId, status, sessionObj) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Busca detalhes da subscription no Stripe para obter datas do período
    let periodoInicio = null;
    let periodoFim = null;

    if (subscriptionId) {
      try {
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        periodoInicio = sub.current_period_start ? new Date(sub.current_period_start * 1000) : null;
        periodoFim = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
        status = sub.status || status;
      } catch (e) {
        console.warn('[Webhook] Não foi possível buscar detalhes da subscription:', e.message);
      }
    }

    // Upsert na tabela de assinaturas (cria ou atualiza)
    await conn.query(`
      INSERT INTO stripe_subscriptions
        (usuario_id, stripe_customer_id, stripe_subscription_id, status, periodo_inicio, periodo_fim, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        stripe_customer_id = VALUES(stripe_customer_id),
        stripe_subscription_id = VALUES(stripe_subscription_id),
        status = VALUES(status),
        periodo_inicio = VALUES(periodo_inicio),
        periodo_fim = VALUES(periodo_fim),
        atualizado_em = NOW()
    `, [usuarioId, customerId, subscriptionId, status, periodoInicio, periodoFim]);

    // Atualiza o papel do usuário para 'premium' SOMENTE se status for ativo
    if (status === 'active' || status === 'trialing') {
      const [currentUser] = await conn.query('SELECT papel FROM usuarios WHERE id = ?', [usuarioId]);
      // Não rebaixa admin para premium
      if (currentUser.length > 0 && currentUser[0].papel !== 'admin') {
        await conn.query('UPDATE usuarios SET papel = ? WHERE id = ?', ['premium', usuarioId]);
        console.log(`[Stripe] Usuário ID ${usuarioId} promovido para premium (status: ${status}).`);
      }
    }

    await conn.commit();

    sendLog('STRIPE_PREMIUM_ATIVADO', null, {
      usuario_id: usuarioId,
      subscription_id: subscriptionId,
      customer_id: customerId,
      status
    });

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Atualiza o status da assinatura sem alterar o papel do usuário
 * (usado para estados intermediários como past_due).
 */
async function _atualizarStatusSubscription(subscriptionId, status) {
  await pool.query(
    'UPDATE stripe_subscriptions SET status = ?, atualizado_em = NOW() WHERE stripe_subscription_id = ?',
    [status, subscriptionId]
  );
}

/**
 * Registra falha de pagamento (invoice.payment_failed), marcando a assinatura como past_due
 * e registrando evento de auditoria sem derrubar a sessão do usuário.
 */
async function _registrarFalhaPagamento(invoice) {
  const subscriptionId = invoice.subscription || null;
  const customerId = invoice.customer || null;

  if (!subscriptionId && !customerId) {
    return;
  }

  let usuarioId = null;
  if (subscriptionId) {
    const [rows] = await pool.query(
      'SELECT usuario_id FROM stripe_subscriptions WHERE stripe_subscription_id = ? LIMIT 1',
      [subscriptionId]
    );
    if (rows.length > 0) {
      usuarioId = rows[0].usuario_id;
      await pool.query(
        'UPDATE stripe_subscriptions SET status = ?, atualizado_em = NOW() WHERE stripe_subscription_id = ?',
        ['past_due', subscriptionId]
      );
    }
  }

  if (!usuarioId && customerId) {
    const [rows] = await pool.query(
      'SELECT usuario_id FROM stripe_subscriptions WHERE stripe_customer_id = ? LIMIT 1',
      [customerId]
    );
    if (rows.length > 0) {
      usuarioId = rows[0].usuario_id;
      await pool.query(
        `UPDATE stripe_subscriptions
         SET status = 'past_due',
             stripe_subscription_id = COALESCE(stripe_subscription_id, ?),
             atualizado_em = NOW()
         WHERE stripe_customer_id = ?`,
        [subscriptionId, customerId]
      );
    }
  }

  sendLog('STRIPE_PAGAMENTO_FALHOU', null, {
    usuario_id: usuarioId || 'desconhecido',
    subscription_id: subscriptionId,
    customer_id: customerId,
    attempt_count: invoice.attempt_count || 1,
    status: 'past_due'
  });
}

/**
 * Sincroniza o estado de uma subscription atualizada pelo Stripe.
 * Apenas promove/revoga baseado no status atual.
 */
async function _sincronizarSubscription(subscription) {
  const { id: subscriptionId, status } = subscription;

  // Correspondência estrita por stripe_subscription_id para evitar que assinatura antiga/cancelada revogue assinatura ativa
  const [rows] = await pool.query(
    'SELECT usuario_id FROM stripe_subscriptions WHERE stripe_subscription_id = ? LIMIT 1',
    [subscriptionId]
  );

  if (rows.length === 0) {
    console.warn('[Webhook] subscription.updated: assinatura não encontrada no banco (ou já substituída):', subscriptionId);
    return;
  }

  const usuarioId = rows[0].usuario_id;

  // Atualiza datas do período
  const periodoInicio = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000) : null;
  const periodoFim = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000) : null;

  await pool.query(
    'UPDATE stripe_subscriptions SET status = ?, periodo_inicio = ?, periodo_fim = ?, atualizado_em = NOW() WHERE stripe_subscription_id = ?',
    [status, periodoInicio, periodoFim, subscriptionId]
  );

  // Atualiza papel do usuário baseado no status
  if (status === 'active' || status === 'trialing') {
    const [currentUser] = await pool.query('SELECT papel FROM usuarios WHERE id = ?', [usuarioId]);
    if (currentUser.length > 0 && currentUser[0].papel !== 'admin') {
      await pool.query('UPDATE usuarios SET papel = ? WHERE id = ?', ['premium', usuarioId]);
    }
  } else if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
    await _rebaixarParaUsuarioComum(usuarioId, subscriptionId, status);
  } else if (status === 'past_due') {
    await evaluateUserEntitlement(pool, usuarioId);
  }
}

/**
 * Revoga o acesso Premium quando a assinatura é cancelada definitivamente.
 */
async function _revogarPremium(subscription) {
  const { id: subscriptionId } = subscription;

  // Correspondência estrita por stripe_subscription_id para não revogar assinatura nova do mesmo customer
  const [rows] = await pool.query(
    'SELECT usuario_id FROM stripe_subscriptions WHERE stripe_subscription_id = ? LIMIT 1',
    [subscriptionId]
  );

  if (rows.length === 0) {
    console.warn('[Webhook] subscription.deleted: assinatura não encontrada (ou já substituída):', subscriptionId);
    return;
  }

  const usuarioId = rows[0].usuario_id;
  await _rebaixarParaUsuarioComum(usuarioId, subscriptionId, 'canceled');
}

/**
 * Reverte o papel do usuário de 'premium' para 'usuario'.
 * Administradores não são afetados.
 */
async function _rebaixarParaUsuarioComum(usuarioId, subscriptionId, motivo) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [subUpdate] = await conn.query(
      'UPDATE stripe_subscriptions SET status = ?, atualizado_em = NOW() WHERE usuario_id = ? AND stripe_subscription_id = ?',
      [motivo, usuarioId, subscriptionId]
    );

    if (subUpdate.affectedRows > 0) {
      const [currentUser] = await conn.query('SELECT papel FROM usuarios WHERE id = ? FOR UPDATE', [usuarioId]);
      if (currentUser.length > 0 && currentUser[0].papel === 'premium') {
        await conn.query('UPDATE usuarios SET papel = ? WHERE id = ?', ['usuario', usuarioId]);
        console.log(`[Stripe] Usuário ID ${usuarioId} revertido para 'usuario' (motivo: ${motivo}).`);
      }
    }

    await conn.commit();

    sendLog('STRIPE_PREMIUM_REVOGADO', null, {
      usuario_id: usuarioId,
      subscription_id: subscriptionId,
      motivo
    });

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  getSubscriptionStatus
};
