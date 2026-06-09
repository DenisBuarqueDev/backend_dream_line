const User = require('../models/User');
const { errorResponse, successResponse } = require('../utils/response');
const { createCheckoutPreference } = require('../services/mercadoPagoCheckoutService');

const createCheckout = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    const checkout = await createCheckoutPreference({
      userId: user._id.toString(),
      userEmail: user.email,
    });

    return successResponse(res, checkout);
  } catch (error) {
    console.error('[MP] Erro ao criar checkout:', error.response?.data || error.message);
    next(error);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('plan subscription premiumSince premiumExpiresAt lastPaymentId');
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    const planInfo = user.checkUserPlan();

    return successResponse(res, {
      plan: user.plan,
      status: user.subscription?.status || 'inactive',
      isPremium: planInfo.isPremium,
      daysRemaining: planInfo.daysRemaining,
      premiumSince: planInfo.premiumSince,
      premiumExpiresAt: planInfo.premiumExpiresAt,
      lastPaymentId: user.lastPaymentId,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createCheckout, getStatus };
