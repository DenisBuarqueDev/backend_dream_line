const User = require('../models/User');
const { errorResponse, successResponse } = require('../utils/response');

const upgradePlan = async (req, res, next) => {
  try {
    const { plan } = req.body;

    if (!plan || !['premium', 'pro'].includes(plan)) {
      return errorResponse(res, 'Plano inválido', 400);
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    user.plan = plan;
    user.dreamLimitResetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await user.save();

    const planInfo = user.checkUserPlan();

    return successResponse(res, {
      message: 'Plano atualizado com sucesso',
      plan: user.plan,
      planInfo: {
        remainingDreams: planInfo.remainingDreams,
        maxDreams: planInfo.maxDreams,
        canGenerateImage: planInfo.canGenerateImage,
        canUseSleepMode: planInfo.canUseSleepMode,
        canSeeWeeklySummary: planInfo.canSeeWeeklySummary
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentPlan = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    const planInfo = user.checkUserPlan();

    return successResponse(res, {
      plan: user.plan,
      dreamCount: user.dreamCount,
      dreamLimitResetAt: user.dreamLimitResetAt,
      planInfo: {
        remainingDreams: planInfo.remainingDreams,
        maxDreams: planInfo.maxDreams,
        canGenerateImage: planInfo.canGenerateImage,
        canUseSleepMode: planInfo.canUseSleepMode,
        canSeeWeeklySummary: planInfo.canSeeWeeklySummary
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { upgradePlan, getCurrentPlan };