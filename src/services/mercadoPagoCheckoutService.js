const axios = require('axios');
const User = require('../models/User');
const SubscriptionLog = require('../models/SubscriptionLog');

const MP_API_URL = 'https://api.mercadopago.com';

function getHeaders() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function logAction({ userId, action, plan, status, metadata, ip, userAgent }) {
  try {
    await SubscriptionLog.create({ userId, action, plan, status, metadata, ip, userAgent });
  } catch (err) {
    console.error('Erro ao salvar log:', err.message);
  }
}

async function getPayment(paymentId) {
  const { data } = await axios.get(`${MP_API_URL}/v1/payments/${paymentId}`, { headers: getHeaders() });
  return data;
}

async function createCheckoutPreference({ userId, userEmail }) {
  const amount = parseFloat(process.env.MERCADOPAGO_PREMIUM_AMOUNT || '24.90');
  const backUrl = process.env.FRONTEND_URL || 'https://dream-line.vercel.app';

  const body = {
    items: [{
      title: 'Dream Line Premium - 30 dias',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: amount,
    }],
    external_reference: `${userId}:premium`,
    back_urls: {
      success: `${backUrl}/payment-success`,
      failure: backUrl,
      pending: backUrl,
    },
    auto_return: 'approved',
    notification_url: 'https://backend-dream-line.onrender.com/api/payments/webhook',
    statement_descriptor: 'DREAM LINE PREMIUM',
    payer: userEmail ? { email: userEmail } : undefined,
  };

  const { data } = await axios.post(`${MP_API_URL}/checkout/preferences`, body, { headers: getHeaders() });

  await logAction({
    userId,
    action: 'checkout_preference_created',
    plan: 'premium',
    status: 'pending',
    metadata: { preferenceId: data.id, initPoint: data.init_point },
  });

  return { initPoint: data.init_point, preferenceId: data.id };
}

async function processPaymentEvent({ paymentId, ip, userAgent }) {
  console.log('[MP processPaymentEvent] Iniciando para paymentId:', paymentId);

  let payment;
  try {
    payment = await getPayment(paymentId);
    console.log('[MP processPaymentEvent] Payment recebido. Status:', payment.status, 'ExternalRef:', payment.external_reference);
  } catch (err) {
    console.error('[MP processPaymentEvent] Erro ao buscar payment:', err.message);
    return { processed: false, reason: 'erro ao buscar pagamento' };
  }

  if (payment.status !== 'approved') {
    console.log(`[MP processPaymentEvent] Payment ${paymentId} status: ${payment.status} — ignorado`);
    return { processed: false, reason: `status: ${payment.status}` };
  }

  const externalRef = payment.external_reference;
  let userId = null;

  if (externalRef) {
    const parts = externalRef.split(':');
    if (parts.length >= 2) {
      userId = parts[0];
      console.log('[MP processPaymentEvent] userId extraído de external_reference:', userId);
    }
  }

  if (!userId) {
    const payerEmail = payment.payer?.email;
    console.log('[MP processPaymentEvent] Buscando userId por email:', payerEmail);
    if (payerEmail) {
      const user = await User.findOne({ email: payerEmail.toLowerCase() }).select('_id');
      if (user) {
        userId = user._id.toString();
        console.log('[MP processPaymentEvent] userId encontrado por email:', userId);
      }
    }
  }

  if (!userId) {
    console.error('[MP processPaymentEvent] Usuário não identificado para payment', paymentId);
    await logAction({
      userId: null,
      action: 'payment_received',
      metadata: { paymentId, error: 'usuário não identificado', payment },
      ip,
      userAgent,
    });
    return { processed: false, reason: 'usuário não identificado' };
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error('[MP processPaymentEvent] Usuário não encontrado:', userId);
    return { processed: false, reason: 'usuário não encontrado' };
  }

  console.log('[MP processPaymentEvent] Ativando premium para:', user.email, 'userId:', userId);
  user.activatePremium(paymentId);
  await user.save();
  console.log('[MP processPaymentEvent] Premium ATIVADO. plan:', user.plan, 'expiresAt:', user.premiumExpiresAt, 'lastPaymentId:', user.lastPaymentId);

  await logAction({
    userId: user._id,
    action: 'payment_received',
    plan: 'premium',
    status: 'active',
    metadata: { paymentId, approvedAt: new Date().toISOString(), expiresAt: user.premiumExpiresAt },
    ip,
    userAgent,
  });

  return { processed: true, event: 'payment.approved', userId, days: 30 };
}

module.exports = { createCheckoutPreference, processPaymentEvent };
