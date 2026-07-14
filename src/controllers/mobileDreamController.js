const Dream = require('../models/Dream');
const User = require('../models/User');
const { errorResponse, successResponse } = require('../utils/response');
const fluxService = require('../services/ai/fluxService');

const generateImageMobile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    const planInfo = user.checkUserPlan();
    if (!planInfo.canGenerateImage) {
      return errorResponse(res, 'Funcionalidade disponível apenas para plano Premium', 403);
    }

    const dream = await Dream.findOne({ _id: id, userId: req.userId });
    if (!dream) {
      return errorResponse(res, 'Dream not found', 404);
    }

    const interpretacao = dream.aiData?.interpretation || dream.interpretacao;
    const emotions = dream.aiData?.emotions || [];

    const imageResult = await fluxService.generateDreamImageMobile(interpretacao, emotions, {
      dreamText: dream.textoSonho,
    });

    if (imageResult.imageUrl) {
      dream.imageUrl = imageResult.imageUrl;
      dream.imageGeneratedAt = new Date();
      if (imageResult.cloudinaryPublicId) {
        dream.imagePublicId = imageResult.cloudinaryPublicId;
      }
      if (!dream.aiData) dream.aiData = {};
      dream.aiData.imagePrompt = imageResult.prompt;
      dream.aiData.imageSeed = imageResult.seed;
      dream.aiData.generatedAt = new Date();
    } else if (imageResult.status === 429) {
      return errorResponse(res, imageResult.error || 'Limite de uso ou créditos insuficientes', 429);
    } else {
      return errorResponse(res, imageResult.error || 'Falha ao gerar imagem', imageResult.status || 500);
    }

    await dream.save();

    return successResponse(res, {
      message: 'Image generated successfully',
      dream,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateImageMobile };