const User = require('../models/User');
const { errorResponse, successResponse } = require('../utils/response');
const { createPremiumSubscription } = require('../services/mercadoPagoSubscriptionService');

const createSubscription = async (req, res, next) => {
  try {
    const { plan } = req.body;

    if (plan !== 'premium') {
      return errorResponse(res, 'Plano inválido', 400);
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    const subscriptionData = await createPremiumSubscription({ userId: user._id.toString(), userEmail: user.email });

    return successResponse(res, {
      initPoint: subscriptionData.initPoint,
      subscriptionId: subscriptionData.subscriptionId,
    });
  } catch (error) {
    console.error('[MP] Erro ao criar assinatura:', error.response?.data || error.message);
    next(error);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('subscription plan');

    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    return successResponse(res, {
      plan: user.subscription.plan,
      status: user.subscription.status,
      startedAt: user.subscription.startedAt,
      expiresAt: user.subscription.expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createSubscription, getStatus };
