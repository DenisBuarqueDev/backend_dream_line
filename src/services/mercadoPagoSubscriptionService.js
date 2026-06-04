const axios = require('axios');
const mongoose = require('mongoose');
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

function getPlanId(plan) {
  if (plan === 'premium') {
    const id = process.env.MERCADOPAGO_PREMIUM_PLAN_ID;
    if (!id) throw new Error('MERCADOPAGO_PREMIUM_PLAN_ID não configurado');
    return id;
  }
  if (plan === 'pro') {
    const id = process.env.MERCADOPAGO_PRO_PLAN_ID;
    if (!id) throw new Error('MERCADOPAGO_PRO_PLAN_ID não configurado');
    return id;
  }
  throw new Error('Plano inválido');
}

async function logSubscriptionAction({ userId, action, plan, status, metadata, mercadoPagoSubscriptionId, mercadoPagoPlanId, ip, userAgent }) {
  try {
    await SubscriptionLog.create({
      userId,
      action,
      plan,
      status,
      mercadoPagoSubscriptionId,
      mercadoPagoPlanId,
      metadata,
      ip,
      userAgent,
    });
  } catch (logError) {
    console.error('Erro ao salvar log de assinatura:', logError.message);
  }
}

async function getPayment(paymentId) {
  console.log(`[MP] Buscando payment ${paymentId}`);
  const response = await axios.get(`${MP_API_URL}/v1/payments/${paymentId}`, { headers: getHeaders() });
  console.log(`[MP] Payment response:`, JSON.stringify(response.data, null, 2));
  return response.data;
}

async function getSubscription(subscriptionId) {
  console.log(`[MP] Buscando subscription ${subscriptionId}`);
  const response = await axios.get(`${MP_API_URL}/preapproval/${subscriptionId}`, { headers: getHeaders() });
  console.log(`[MP] Subscription response:`, JSON.stringify(response.data, null, 2));
  return response.data;
}

function parseExternalReference(externalReference) {
  if (!externalReference || typeof externalReference !== 'string') return null;
  const parts = externalReference.split(':');
  if (parts.length < 2) return null;
  return { userId: parts[0], plan: parts[1] };
}

async function activateSubscription({ userId, plan, mercadoPagoSubscriptionId }) {
  const user = await User.findById(userId);
  if (!user) {
    console.error(`[MP Webhook] Usuário ${userId} não encontrado para ativação`);
    return null;
  }

  user.plan = plan;
  user.subscription.plan = plan;
  user.subscription.status = 'active';
  user.subscription.startedAt = new Date();
  user.subscription.lastPaymentAt = new Date();
  if (mercadoPagoSubscriptionId) {
    user.subscription.mercadoPagoSubscriptionId = mercadoPagoSubscriptionId;
  }
  await user.save();

  console.log(`[MP Webhook] Assinatura ATIVADA para ${user.email} | plano: ${plan}`);

  await logSubscriptionAction({
    userId: user._id,
    action: 'subscription_activated',
    plan,
    status: 'active',
    mercadoPagoSubscriptionId,
    metadata: { activatedAt: new Date().toISOString() },
  });

  return user;
}

async function cancelSubscription(subscriptionId) {
  console.log(`[MP] Cancelando subscription ${subscriptionId}`);

  const body = { status: 'cancelled' };
  const response = await axios.put(`${MP_API_URL}/preapproval/${subscriptionId}`, body, { headers: getHeaders() });

  console.log(`[MP] Cancelamento resposta:`, JSON.stringify(response.data, null, 2));

  await logSubscriptionAction({
    userId: null,
    action: 'subscription_cancelled',
    mercadoPagoSubscriptionId: subscriptionId,
    metadata: {
      response: response.data,
      statusCode: response.status,
    },
  });

  return response.data;
}

async function cancelUserPlan(userId) {
  const user = await User.findById(userId);
  if (!user) {
    console.error(`[MP Webhook] Usuário ${userId} não encontrado para cancelamento`);
    return null;
  }

  user.plan = 'free';
  user.subscription.plan = 'free';
  user.subscription.status = 'cancelled';
  await user.save();

  console.log(`[MP Webhook] Assinatura CANCELADA para ${user.email}`);

  await logSubscriptionAction({
    userId: user._id,
    action: 'subscription_cancelled',
    plan: 'free',
    status: 'cancelled',
    mercadoPagoSubscriptionId: user.subscription.mercadoPagoSubscriptionId,
    metadata: { cancelledAt: new Date().toISOString() },
  });

  return user;
}

async function expireUserPlan(userId) {
  const user = await User.findById(userId);
  if (!user) {
    console.error(`[MP Webhook] Usuário ${userId} não encontrado para expiração`);
    return null;
  }

  user.plan = 'free';
  user.subscription.plan = 'free';
  user.subscription.status = 'expired';
  await user.save();

  console.log(`[MP Webhook] Assinatura EXPIRADA para ${user.email}`);

  await logSubscriptionAction({
    userId: user._id,
    action: 'subscription_expired',
    plan: 'free',
    status: 'expired',
    mercadoPagoSubscriptionId: user.subscription.mercadoPagoSubscriptionId,
    metadata: { expiredAt: new Date().toISOString() },
  });

  return user;
}

async function renewSubscription(userId) {
  const user = await User.findById(userId);
  if (!user) {
    console.error(`[MP Webhook] Usuário ${userId} não encontrado para renovação`);
    return null;
  }

  user.subscription.lastPaymentAt = new Date();
  user.subscription.status = 'active';
  await user.save();

  console.log(`[MP Webhook] Assinatura RENOVADA para ${user.email}`);

  await logSubscriptionAction({
    userId: user._id,
    action: 'payment_received',
    plan: user.subscription.plan,
    status: 'active',
    mercadoPagoSubscriptionId: user.subscription.mercadoPagoSubscriptionId,
    metadata: { renewedAt: new Date().toISOString() },
  });

  return user;
}

async function createPreapproval({ userId, userEmail, plan, payerEmail }) {
  const planId = getPlanId(plan);
  const externalReference = `${userId}:${plan}`;

  const body = {
    preapproval_plan_id: planId,
    external_reference: externalReference,
    payer_email: payerEmail || userEmail,
    auto_recurring: { frequency: 1, frequency_type: 'months' },
    reason: `Dream Line ${plan === 'premium' ? 'Premium' : 'Pro'}`,
  };

  console.log(`[MP] Criando preapproval para usuário ${userId} | plano: ${plan}`);
  console.log(`[MP] Request body:`, JSON.stringify(body, null, 2));

  const response = await axios.post(`${MP_API_URL}/preapproval`, body, { headers: getHeaders() });

  console.log(`[MP] Resposta:`, JSON.stringify(response.data, null, 2));

  await logSubscriptionAction({
    userId,
    action: 'subscription_created',
    plan,
    status: 'inactive',
    mercadoPagoSubscriptionId: response.data.id,
    mercadoPagoPlanId: planId,
    metadata: {
      response: response.data,
      request: body,
      statusCode: response.status,
    },
  });

  return response.data;
}

async function createPremiumSubscription({ userId, userEmail }) {
  const data = await createPreapproval({ userId, userEmail, plan: 'premium' });
  return { initPoint: data.init_point, subscriptionId: data.id, status: data.status };
}

async function createProSubscription({ userId, userEmail }) {
  const data = await createPreapproval({ userId, userEmail, plan: 'pro' });
  return { initPoint: data.init_point, subscriptionId: data.id, status: data.status };
}

async function fetchResourceByType(resourceId, resourceType) {
  if (resourceType === 'payment' || resourceType === 'payment.created' || resourceType === 'payment.updated') {
    return await getPayment(resourceId);
  }
  if (resourceType === 'subscription' || resourceType === 'preapproval') {
    return await getSubscription(resourceId);
  }
  if (resourceType === 'subscription_created' || resourceType === 'subscription_cancelled' || resourceType === 'subscription_updated') {
    return await getSubscription(resourceId);
  }
  return null;
}

async function processWebhookEvent({ action, resourceId, resourceType, rawBody, ip, userAgent }) {
  console.log(`[MP Webhook] Evento recebido: action=${action}, resourceId=${resourceId}, type=${resourceType}`);

  let resourceData = null;

  if (resourceId) {
    try {
      resourceData = await fetchResourceByType(resourceId, resourceType || action);
    } catch (fetchError) {
      console.error(`[MP Webhook] Erro ao buscar recurso ${resourceId}:`, fetchError.response?.data || fetchError.message);
    }
  }

  const verifiedData = resourceData || rawBody?.data || {};

  const externalReference = verifiedData.external_reference || verifiedData.externalReference;
  const parsed = parseExternalReference(externalReference);

  const subscriptionId = verifiedData.id || resourceId;

  if (!parsed || !mongoose.Types.ObjectId.isValid(parsed.userId)) {
    console.log(`[MP Webhook] external_reference inválido ou userId não encontrado: ${externalReference}`);
    await logSubscriptionAction({
      userId: null,
      action: 'webhook_received',
      metadata: {
        action,
        resourceId,
        resourceType,
        externalReference,
        verifiedData,
        rawBody,
        error: 'external_reference inválido',
      },
      ip,
      userAgent,
    });
    return { processed: false, reason: 'external_reference inválido' };
  }

  const userId = parsed.userId;
  const plan = parsed.plan;

  await logSubscriptionAction({
    userId,
    action: 'webhook_received',
    plan,
    mercadoPagoSubscriptionId: subscriptionId,
    metadata: { action, resourceId, resourceType, verifiedData, rawBody },
    ip,
    userAgent,
  });

  const eventAction = action || '';
  const resourceStatus = verifiedData.status || '';

  if (eventAction.includes('payment')) {
    if (resourceStatus === 'approved' || eventAction.includes('approved')) {
      await activateSubscription({ userId, plan, mercadoPagoSubscriptionId: subscriptionId });
      return { processed: true, event: 'payment_approved', userId, plan };
    }
    if (resourceStatus === 'rejected' || eventAction.includes('rejected')) {
      await expireUserPlan(userId);
      return { processed: true, event: 'payment_rejected', userId, plan };
    }
    if (resourceStatus === 'refunded' || eventAction.includes('refunded')) {
      await expireUserPlan(userId);
      return { processed: true, event: 'payment_refunded', userId, plan };
    }
    if (eventAction === 'payment.created' && resourceStatus === 'approved') {
      await renewSubscription(userId);
      return { processed: true, event: 'payment_received', userId, plan };
    }
  }

  if (eventAction.includes('subscription') || eventAction.includes('preapproval')) {
    if (resourceStatus === 'authorized' || resourceStatus === 'active' || eventAction === 'subscription_created') {
      await activateSubscription({ userId, plan, mercadoPagoSubscriptionId: subscriptionId });
      return { processed: true, event: 'subscription_activated', userId, plan };
    }
    if (resourceStatus === 'cancelled' || eventAction.includes('cancelled')) {
      await cancelUserPlan(userId);
      return { processed: true, event: 'subscription_cancelled', userId };
    }
    if (resourceStatus === 'expired' || eventAction.includes('expired')) {
      await expireUserPlan(userId);
      return { processed: true, event: 'subscription_expired', userId };
    }
    if (eventAction === 'subscription.updated' && resourceStatus === 'authorized') {
      await renewSubscription(userId);
      return { processed: true, event: 'subscription_renewed', userId, plan };
    }
  }

  console.log(`[MP Webhook] Evento não mapeado: action=${eventAction}, status=${resourceStatus}`);
  return { processed: false, reason: 'evento não mapeado', eventAction, resourceStatus };
}

module.exports = {
  createPremiumSubscription,
  createProSubscription,
  cancelSubscription,
  getSubscription,
  getPayment,
  processWebhookEvent,
  parseExternalReference,
};
