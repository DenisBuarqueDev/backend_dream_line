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
  const response = await axios.get(`${MP_API_URL}/v1/payments/${paymentId}`, { headers: getHeaders() });
  return response.data;
}

async function getSubscription(subscriptionId) {
  const response = await axios.get(`${MP_API_URL}/preapproval/${subscriptionId}`, { headers: getHeaders() });
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

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  user.plan = plan;
  user.subscription.plan = plan;
  user.subscription.status = 'active';
  user.subscription.startedAt = now;
  user.subscription.expiresAt = expiresAt;
  user.subscription.lastPaymentAt = now;
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

  if (user.subscription.mercadoPagoSubscriptionId) {
    try {
      await cancelSubscription(user.subscription.mercadoPagoSubscriptionId);
    } catch (cancelErr) {
      console.error(`[MP Webhook] Erro ao cancelar no Mercado Pago:`, cancelErr.message);
    }
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

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  user.subscription.lastPaymentAt = now;
  user.subscription.expiresAt = expiresAt;
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

async function createPreapprovalPlan({ plan }) {
  const amountKey = 'MERCADOPAGO_PREMIUM_AMOUNT';
  const transactionAmount = parseFloat(process.env[amountKey]);
  if (isNaN(transactionAmount)) {
    throw new Error(`${amountKey} não configurado ou inválido`);
  }
  const backUrl = process.env.FRONTEND_URL || 'https://frontend-dream-line.vercel.app';

  const body = {
    reason: 'Dream Line Premium',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: transactionAmount,
      currency_id: 'BRL',
    },
    payment_methods_allowed: {
      payment_types: [{ id: 'credit_card' }],
    },
    back_url: backUrl + '/payment-success',
  };

  console.log(`[MP] Criando plano de assinatura...`);
  console.log(`[MP] Request body:`, JSON.stringify(body, null, 2));

  const response = await axios.post(`${MP_API_URL}/preapproval_plan`, body, { headers: getHeaders() });

  console.log(`[MP] Plano criado:`, JSON.stringify(response.data, null, 2));

  await logSubscriptionAction({
    userId: null,
    action: 'plan_created',
    plan,
    metadata: {
      planId: response.data.id,
      response: response.data,
      statusCode: response.status,
    },
  });

  return response.data;
}

async function createPreapprovalSubscription({ userId, userEmail, plan, cardTokenId }) {
  const externalReference = `${userId}:${plan}`;
  const amountKey = 'MERCADOPAGO_PREMIUM_AMOUNT';
  const transactionAmount = parseFloat(process.env[amountKey]);
  if (isNaN(transactionAmount)) {
    throw new Error(`${amountKey} não configurado ou inválido`);
  }
  const backUrl = process.env.FRONTEND_URL || 'https://frontend-dream-line.vercel.app';

  const planId = process.env.MERCADOPAGO_PREMIUM_PLAN_ID;

  const autoRecurring = {
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: transactionAmount,
    currency_id: 'BRL',
  };

  let body;
  let endpoint;

  if (cardTokenId) {
    if (!planId) {
      throw new Error('MERCADOPAGO_PREMIUM_PLAN_ID não configurado. Execute o script setup-mercadopago-plan.js primeiro.');
    }
    body = {
      preapproval_plan_id: planId,
      reason: 'Dream Line Premium',
      external_reference: externalReference,
      payer_email: userEmail,
      card_token_id: cardTokenId,
      back_url: backUrl + '/payment-success',
      status: 'authorized',
    };
    endpoint = `${MP_API_URL}/preapproval`;
    console.log(`[MP] Criando assinatura autorizada (com cartão) para ${userId}`);
  } else {
    body = {
      reason: 'Dream Line Premium',
      external_reference: externalReference,
      payer_email: userEmail,
      auto_recurring: autoRecurring,
      back_url: backUrl + '/payment-success',
      status: 'pending',
    };
    endpoint = `${MP_API_URL}/preapproval`;
    console.log(`[MP] Criando preapproval pendente para ${userId}`);
  }

  console.log(`[MP] Payload:`, JSON.stringify(body, null, 2));

  const response = await axios.post(endpoint, body, { headers: getHeaders() });

  console.log(`[MP] Preapproval criado:`, JSON.stringify(response.data, null, 2));

  await logSubscriptionAction({
    userId,
    action: 'subscription_created',
    plan,
    status: response.data.status || 'pending',
    mercadoPagoSubscriptionId: response.data.id,
    metadata: {
      response: response.data,
      request: body,
      statusCode: response.status,
    },
  });

  return { ...response.data, usedCardToken: !!cardTokenId };
}

async function createPremiumSubscription({ userId, userEmail, cardTokenId }) {
  try {
    const data = await createPreapprovalSubscription({
      userId,
      userEmail,
      plan: 'premium',
      cardTokenId,
    });
    return { initPoint: data.init_point, subscriptionId: data.id, status: data.status, usedCardToken: data.usedCardToken };
  } catch (error) {
    const mpError = error.response?.data?.message || '';
    if (mpError.includes('payer_email') || mpError.includes('real or test users')) {
      console.log('[MP] Preapproval com email falhou. Usando fallback Checkout Pro.');
      return await createPremiumCheckout({ userId, userEmail });
    }
    throw error;
  }
}

async function createPaymentPreference({ userId, userEmail, plan }) {
  const externalReference = `${userId}:${plan}`;
  const amountKey = 'MERCADOPAGO_PREMIUM_AMOUNT';
  const transactionAmount = parseFloat(process.env[amountKey]);
  if (isNaN(transactionAmount)) {
    throw new Error(`${amountKey} não configurado ou inválido`);
  }
  const backUrl = process.env.FRONTEND_URL || 'https://frontend-dream-line.vercel.app';

  const body = {
    items: [{
      title: 'Dream Line Premium - 1 mês',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: transactionAmount,
    }],
    external_reference: externalReference,
    back_urls: {
      success: backUrl + '/payment-success',
      failure: backUrl,
      pending: backUrl,
    },
    auto_return: 'approved',
    statement_descriptor: 'DREAM LINE PREMIUM',
  };

  if (userEmail) {
    body.payer = { email: userEmail };
  }

  const response = await axios.post(`${MP_API_URL}/checkout/preferences`, body, { headers: getHeaders() });

  await logSubscriptionAction({
    userId,
    action: 'checkout_preference_created',
    plan,
    status: 'inactive',
    metadata: {
      preferenceId: response.data.id,
      response: response.data,
      statusCode: response.status,
    },
  });

  return response.data;
}

async function createPremiumCheckout({ userId, userEmail }) {
  const data = await createPaymentPreference({ userId, userEmail, plan: 'premium' });
  return { initPoint: data.init_point, subscriptionId: data.id, status: 'pending' };
}

async function fetchResourceByType(resourceId, resourceType) {
  if (resourceType === 'payment' || resourceType === 'payment.created' || resourceType === 'payment.updated') {
    return await getPayment(resourceId);
  }
  if (resourceType === 'subscription' || resourceType === 'preapproval' || resourceType === 'subscription_preapproval') {
    return await getSubscription(resourceId);
  }
  if (resourceType === 'subscription_created' || resourceType === 'subscription_cancelled' || resourceType === 'subscription_updated') {
    return await getSubscription(resourceId);
  }
  return null;
}

async function processWebhookEvent({ action, resourceId, resourceType, rawBody, ip, userAgent }) {
  let resourceData = null;

  if (resourceId) {
    try {
      resourceData = await fetchResourceByType(resourceId, resourceType || action);
    } catch (fetchError) {
      console.error(`[MP Webhook] Erro ao buscar recurso ${resourceId}:`, fetchError.response?.data || fetchError.message);
    }
  }

  const verifiedData = resourceData || rawBody?.data || {};

  let externalReference = verifiedData.external_reference || verifiedData.externalReference;
  let parsed = parseExternalReference(externalReference);
  let subscriptionId = verifiedData.id || resourceId;

  if (!parsed && verifiedData.preapproval_id) {
    try {
      const parentSub = await getSubscription(verifiedData.preapproval_id);
      externalReference = parentSub.external_reference || parentSub.externalReference;
      parsed = parseExternalReference(externalReference);
      if (parsed) {
        subscriptionId = verifiedData.preapproval_id;
        console.log(`[MP Webhook] external_reference recuperado da assinatura pai: ${externalReference}`);
      }
    } catch (subErr) {
      console.error(`[MP Webhook] Erro ao buscar assinatura pai ${verifiedData.preapproval_id}:`, subErr.message);
    }
  }

  if (!parsed || !mongoose.Types.ObjectId.isValid(parsed.userId)) {
    const payerEmail = verifiedData.payer_email || verifiedData.payer?.email;
    if (payerEmail) {
      const userByEmail = await User.findOne({ email: payerEmail.toLowerCase() }).select('_id email');
      if (userByEmail) {
        parsed = { userId: userByEmail._id.toString(), plan: 'premium' };
        subscriptionId = verifiedData.id || subscriptionId;
      } else {
        console.log(`[MP Webhook] Nenhum usuário encontrado com o email: ${payerEmail}`);
      }
    }
  }

  if (!parsed || !mongoose.Types.ObjectId.isValid(parsed.userId)) {
    console.error(`[MP Webhook] Usuário não identificado: ${externalReference}`);
    await logSubscriptionAction({
      userId: null,
      action: 'webhook_received',
      metadata: {
        action,
        resourceId,
        resourceType,
        externalReference,
        payerEmail: verifiedData.payer_email || verifiedData.payer?.email,
        verifiedData,
        rawBody,
        error: 'usuário não identificado',
      },
      ip,
      userAgent,
    });
    return { processed: false, reason: 'usuário não identificado' };
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
    if (eventAction === 'payment.created' && resourceStatus === 'approved') {
      const user = await User.findById(userId).select('subscription.status');
      if (user?.subscription?.status === 'active') {
        await renewSubscription(userId);
        return { processed: true, event: 'payment_received', userId, plan };
      }
      await activateSubscription({ userId, plan, mercadoPagoSubscriptionId: subscriptionId });
      return { processed: true, event: 'payment_approved', userId, plan };
    }
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
  } else if (eventAction.includes('subscription') || eventAction.includes('preapproval')) {
    if (resourceStatus === 'authorized') {
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

  return { processed: false, reason: 'evento não mapeado', eventAction, resourceStatus };
}

module.exports = {
  createPremiumSubscription,
  createPremiumCheckout,
  createPreapprovalPlan,
  cancelSubscription,
  getSubscription,
  getPayment,
  processWebhookEvent,
  parseExternalReference,
};
