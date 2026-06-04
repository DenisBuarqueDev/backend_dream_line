const User = require('../models/User');
const { errorResponse } = require('../utils/response');

const FEATURE_MESSAGES = {
  generate_image: 'Funcionalidade disponível apenas para plano Pro',
  interpret_dream: 'Limite de interpretações do plano atingido',
  sleep_mode: 'Funcionalidade disponível apenas para planos Premium ou Pro',
  weekly_summary: 'Funcionalidade disponível apenas para planos Premium ou Pro'
};

const checkFeatureAccess = (feature) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return errorResponse(res, 'Usuário não autenticado', 401);
      }

      const user = await User.findById(req.userId);
      
      if (!user) {
        return errorResponse(res, 'Usuário não encontrado', 404);
      }

      const planInfo = user.checkUserPlan();

      if (feature === 'interpret_dream') {
        if (!planInfo.canInterpret) {
          return errorResponse(res, FEATURE_MESSAGES[feature], 403);
        }
        
        const wasReset = planInfo.isReset;
        if (wasReset) {
          user.dreamCount = 0;
          user.dreamLimitResetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await user.save();
        }
        
        const incremented = await user.incrementDreamCount();
        if (!incremented) {
          return errorResponse(res, FEATURE_MESSAGES[feature], 403);
        }
        
        req.planInfo = planInfo;
        return next();
      }

      const hasAccess = user.canAccessFeature(feature);
      
      if (!hasAccess) {
        return errorResponse(res, FEATURE_MESSAGES[feature] || 'Acesso não autorizado', 403);
      }

      req.planInfo = planInfo;
      next();
    } catch (error) {
      next(error);
    }
  };
};

const checkDreamLimit = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;
    
    const planInfo = user.checkUserPlan();
    return planInfo.canInterpret;
  } catch (error) {
    return false;
  }
};

const getUserPlanInfo = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;
    
    return user.checkUserPlan();
  } catch (error) {
    return null;
  }
};

const requirePremium = (req, res, next) => {
  return checkFeatureAccess('sleep_mode')(req, res, next);
};

const requirePro = async (req, res, next) => {
  try {
    if (!req.userId) {
      return errorResponse(res, 'Usuário não autenticado', 401);
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    if (user.plan !== 'pro') {
      return errorResponse(res, 'Funcionalidade disponível apenas para plano Pro', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { checkFeatureAccess, checkDreamLimit, getUserPlanInfo, requirePremium, requirePro };