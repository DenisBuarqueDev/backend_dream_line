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
  const backUrl = process.env.FRONTEND_URL || 'https://frontend-dream-line.vercel.app';

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
  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (err) {
    console.error(`[MP] Erro ao buscar payment ${paymentId}:`, err.message);
    return { processed: false, reason: 'erro ao buscar pagamento' };
  }

  if (payment.status !== 'approved') {
    console.log(`[MP] Payment ${paymentId} status: ${payment.status} — ignorado`);
    return { processed: false, reason: `status: ${payment.status}` };
  }

  const externalRef = payment.external_reference;
  let userId = null;

  if (externalRef) {
    const parts = externalRef.split(':');
    if (parts.length >= 2) {
      userId = parts[0];
    }
  }

  if (!userId) {
    const payerEmail = payment.payer?.email;
    if (payerEmail) {
      const user = await User.findOne({ email: payerEmail.toLowerCase() }).select('_id');
      if (user) userId = user._id.toString();
    }
  }

  if (!userId) {
    console.error(`[MP] Usuário não identificado para payment ${paymentId}`);
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
    return { processed: false, reason: 'usuário não encontrado' };
  }

  user.activatePremium(paymentId);
  await user.save();

  console.log(`[MP] Premium ATIVADO para ${user.email} — 30 dias até ${user.premiumExpiresAt}`);

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
