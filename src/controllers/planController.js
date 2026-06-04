const User = require('../models/User');
const { errorResponse, successResponse } = require('../utils/response');

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

module.exports = { getCurrentPlan };