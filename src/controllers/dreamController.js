const Dream = require('../models/Dream');
const User = require('../models/User');
const AstralChart = require('../models/AstralChart');
const { errorResponse, successResponse } = require('../utils/response');
const { calculateDreamNumerology } = require('../services/dreamNumerologyService');
const { checkFeatureAccess } = require('../middleware/planMiddleware');
const aiGateway = require('../services/ai/aiGatewayService');
const cloudinaryService = require('../services/cloudinaryService');

const calculateDuration = (horaDormir, horaAcordar) => {
  const parseTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const dormirMinutos = parseTime(horaDormir);
  let acordarMinutos = parseTime(horaAcordar);

  if (acordarMinutos < dormirMinutos) {
    acordarMinutos += 24 * 60;
  }

  const duracaoMinutos = acordarMinutos - dormirMinutos;
  return Math.round((duracaoMinutos / 60) * 10) / 10;
};

const createDream = async (req, res, next) => {
  try {
    const { textoSonho, interpretacao, categorias, padroes, sono } = req.body;

    if (!textoSonho) {
      return errorResponse(res, 'textoSonho is required', 400);
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    const planInfo = user.checkUserPlan();

    if (!planInfo.canInterpret) {
      return errorResponse(res, 'Limite de interpretações do plano atingido. Faça upgrade para continuar.', 403);
    }

    const wasReset = planInfo.isReset;
    if (wasReset) {
      user.dreamCount = 0;
      user.dreamLimitResetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await user.save();
    }

    await user.incrementDreamCount();

    let aiResult = { interpretacao: '', categorias: [], padroes: { tematicos: [], espirituais: [], biologicos: [] } };
    let aiData = null;

    if (!interpretacao) {
      const astralChart = await AstralChart.findOne({ userId: req.userId })
        .sort({ createdAt: -1 });

      const userContext = astralChart
        ? { sunSign: astralChart.sunSign, moonSign: astralChart.moonSign, ascendant: astralChart.ascendant }
        : {};

      const pipelineResult = await aiGateway.processDreamPipeline(textoSonho, userContext, {
        generateImage: false,
        psychologicalAnalysis: true,
      });

      aiResult.interpretacao = pipelineResult.interpretation;
      aiResult.categorias = pipelineResult.categorias;
      aiResult.padroes = pipelineResult.padroes;

      if (pipelineResult.emotions.length > 0 || pipelineResult.numerology || pipelineResult.spiritualMessage) {
        aiData = {
          transcription: null,
          interpretation: pipelineResult.interpretation,
          emotions: pipelineResult.emotions,
          numerology: pipelineResult.numerology,
          spiritualMessage: pipelineResult.spiritualMessage,
          symbols: pipelineResult.symbols,
          frequencies: pipelineResult.energy ? [pipelineResult.energy] : [],
          chakra: pipelineResult.numerology?.chakra || null,
          psychologicalAnalysis: pipelineResult.psychologicalAnalysis || null,
          provider: pipelineResult.provider,
          generatedAt: new Date(),
        };
      }
    }

    const dreamData = {
      userId: req.userId,
      textoSonho,
      interpretacao: interpretacao || aiResult.interpretacao,
      categorias: categorias || aiResult.categorias,
      padroes: padroes || aiResult.padroes,
      ...(aiData ? { aiData } : {}),
    };

    if (sono) {
      dreamData.sono = {
        horaDormir: sono.horaDormir,
        horaAcordar: sono.horaAcordar,
        duracaoHoras: sono.horaDormir && sono.horaAcordar
          ? calculateDuration(sono.horaDormir, sono.horaAcordar)
          : undefined
      };
    }

    const dream = await Dream.create(dreamData);

    let dreamNumerology = null;
    try {
      const astralChart = await AstralChart.findOne({ userId: req.userId })
        .sort({ createdAt: -1 });

      const interpretacaoTexto = interpretacao || aiResult.interpretacao;

      const astrologyData = astralChart
        ? {
            sunSign: astralChart.sunSign,
            moonSign: astralChart.moonSign,
            ascendant: astralChart.ascendant
          }
        : {};

      dreamNumerology = calculateDreamNumerology({
        interpretacao: interpretacaoTexto,
        ...astrologyData
      });

      if (dreamNumerology) {
        dream.dreamNumerology = dreamNumerology.toJSON();
        await dream.save();
      }
    } catch (numerologyError) {
      console.warn('Numerologia do sonho não gerada (dados insuficientes):', numerologyError.message);
    }

    const updatedUser = await User.findById(req.userId);
    const updatedPlanInfo = updatedUser.checkUserPlan();

    return successResponse(res, {
      message: 'Dream created successfully',
      dream: dreamNumerology
        ? dream.toObject()
        : dream,
      planInfo: {
        remainingDreams: updatedPlanInfo.remainingDreams,
        maxDreams: updatedPlanInfo.maxDreams,
        plan: updatedPlanInfo.plan
      }
    }, 201);
  } catch (error) {
    next(error);
  }
};

const getDreams = async (req, res, next) => {
  try {
    const dreams = await Dream.find({ userId: req.userId })
      .sort({ createdAt: -1 });

    return successResponse(res, { dreams });
  } catch (error) {
    next(error);
  }
};

const deleteDream = async (req, res, next) => {
  try {
    const { id } = req.params;

    const dream = await Dream.findOne({ _id: id, userId: req.userId });

    if (!dream) {
      return errorResponse(res, 'Dream not found', 404);
    }

    if (dream.imagePublicId) {
      await cloudinaryService.deleteDreamImage(dream.imagePublicId);
    }

    await Dream.findByIdAndDelete(id);

    return successResponse(res, { message: 'Dream deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const searchDreamsByDate = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return errorResponse(res, 'startDate and endDate are required', 400);
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dreams = await Dream.find({
      userId: req.userId,
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 });

    return successResponse(res, { dreams });
  } catch (error) {
    next(error);
  }
};

const generateImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageUrl, imagePublicId } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    const planInfo = user.checkUserPlan();
    if (!planInfo.canGenerateImage) {
      return errorResponse(res, 'Funcionalidade disponível apenas para plano Pro', 403);
    }

    const dream = await Dream.findOne({ _id: id, userId: req.userId });

    if (!dream) {
      return errorResponse(res, 'Dream not found', 404);
    }

    if (!imageUrl) {
      try {
        const interpretacao = dream.aiData?.interpretation || dream.interpretacao;
        const emotions = dream.aiData?.emotions || [];
        const imageResult = await aiGateway.generateDreamImage(interpretacao, emotions, {
          dreamText: dream.textoSonho,
        });

        if (imageResult.imageUrl) {
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          dream.imageUrl = imageResult.imageUrl.startsWith('/')
            ? `${baseUrl}${imageResult.imageUrl}`
            : imageResult.imageUrl;
          console.log('🖼 URL da imagem salva:', dream.imageUrl);

          dream.imageGeneratedAt = new Date();
          if (imageResult.cloudinaryPublicId) {
            dream.imagePublicId = imageResult.cloudinaryPublicId;
          }
          if (!dream.aiData) dream.aiData = {};
          dream.aiData.imagePrompt = imageResult.prompt;
          dream.aiData.imageSeed = imageResult.seed;
          dream.aiData.generatedAt = new Date();
        } else if (imageResult.status === 429) {
          return errorResponse(res, imageResult.message || 'Limite de uso ou créditos insuficientes', 429);
        } else {
          return errorResponse(res, imageResult.error || 'Falha ao gerar imagem', 500);
        }
      } catch (fluxError) {
        return errorResponse(res, `Erro na geração de imagem: ${fluxError.message}`, 500);
      }
    } else {
      dream.imageUrl = imageUrl;
      if (imagePublicId) {
        dream.imagePublicId = imagePublicId;
      }
    }

    await dream.save();

    return successResponse(res, {
      message: 'Image generated successfully',
      dream
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createDream, getDreams, deleteDream, searchDreamsByDate, generateImage };
