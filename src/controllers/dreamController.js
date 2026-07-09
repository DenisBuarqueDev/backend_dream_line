const Dream = require('../models/Dream');
const User = require('../models/User');
const AstralChart = require('../models/AstralChart');
const { errorResponse, successResponse } = require('../utils/response');
const { calculateDreamNumerology } = require('../services/dreamNumerologyService');
const { checkFeatureAccess } = require('../middleware/planMiddleware');
const aiGateway = require('../services/ai/aiGatewayService');
const cloudinaryService = require('../services/cloudinaryService');
const memoryService = require('../services/memoryService');

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
      user.dreamLimitResetAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
    }

    await user.incrementDreamCount();

    let aiResult = { interpretacao: '', categorias: [], padroes: { tematicos: [], espirituais: [], biologicos: [] }, tags: [] };
    let aiData = null;

    const astralChart = await AstralChart.findOne({ userId: req.userId })
      .sort({ createdAt: -1 }).lean();

    if (!interpretacao) {
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
      tags: aiResult.tags || [],
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

    memoryService.updateOnNewDream(req.userId, dream);

    const updatedPlanInfo = user.checkUserPlan();

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
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId: req.userId };

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { textoSonho: searchRegex },
        { interpretacao: searchRegex },
        { 'tags.name': searchRegex },
        { 'aiData.symbols.symbol': searchRegex },
        { 'aiData.emotions': searchRegex },
        { dreamCategory: searchRegex },
      ];
    }

    if (req.query.category) {
      filter.dreamCategory = req.query.category;
    }

    if (req.query.startDate || req.query.endDate) {
      const dateFilter = {};
      if (req.query.startDate) {
        const start = new Date(req.query.startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.$gte = start;
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      filter.createdAt = dateFilter;
    }

    if (req.query.hasInterpretation === 'true') {
      filter.interpretacao = { $ne: null };
    }

    if (req.query.hasImage === 'true') {
      filter.imageUrl = { $ne: null };
    }

    if (req.query.hasNumerology === 'true') {
      filter.dreamNumerology = { $ne: null };
    }

    let sortOption = { createdAt: -1 };
    if (req.query.sort === 'oldest') sortOption = { createdAt: 1 };
    else if (req.query.sort === 'longestSleep') sortOption = { 'sono.duracaoHoras': -1 };
    else if (req.query.sort === 'shortestSleep') sortOption = { 'sono.duracaoHoras': 1 };

    const [dreams, total, availableCategories] = await Promise.all([
      Dream.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Dream.countDocuments(filter),
      req.query.includeCategories === 'true'
        ? Dream.distinct('dreamCategory', { userId: req.userId, dreamCategory: { $ne: null } })
        : Promise.resolve(undefined),
    ]);

    const response = {
      dreams,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    if (availableCategories !== undefined) {
      response.availableCategories = availableCategories;
    }

    return successResponse(res, response);
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

    return successResponse(res, { message: 'Sonho excluído com sucesso.' });
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
      return errorResponse(res, 'Funcionalidade disponível apenas para plano Premium', 403);
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

const reinterpretDream = async (req, res, next) => {
  try {
    const { id } = req.params;

    const dream = await Dream.findOne({ _id: id, userId: req.userId });
    if (!dream) {
      return errorResponse(res, 'Sonho não encontrado', 404);
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    const incremented = await user.incrementInterpretationCount();
    if (!incremented) {
      return errorResponse(res, 'Limite de interpretações diárias atingido. Faça upgrade para continuar.', 403);
    }

    const astralChart = await AstralChart.findOne({ userId: req.userId })
      .sort({ createdAt: -1 }).lean();

    const userContext = astralChart
      ? { sunSign: astralChart.sunSign, moonSign: astralChart.moonSign, ascendant: astralChart.ascendant }
      : {};

    const pipelineResult = await aiGateway.processDreamPipeline(dream.textoSonho, userContext, {
      generateImage: false,
      psychologicalAnalysis: true,
    });

    if (pipelineResult.interpretation === dream.interpretacao) {
      return successResponse(res, {
        message: 'A interpretação gerada é idêntica à atual. Nenhuma alteração necessária.',
        dream,
      });
    }

    dream.interpretacao = pipelineResult.interpretation;
    dream.categorias = pipelineResult.categorias;
    dream.tags = pipelineResult.tags || [];
    dream.padroes = {
      tematicos: pipelineResult.padroes?.tematicos || [],
      espirituais: pipelineResult.padroes?.espirituais || [],
      biologicos: pipelineResult.padroes?.biologicos || [],
    };

    dream.aiData = {
      transcription: null,
      interpretation: pipelineResult.interpretation,
      emotions: pipelineResult.emotions || [],
      numerology: pipelineResult.numerology || null,
      spiritualMessage: pipelineResult.spiritualMessage || null,
      symbols: pipelineResult.symbols || [],
      frequencies: pipelineResult.energy ? [pipelineResult.energy] : [],
      chakra: pipelineResult.numerology?.chakra || null,
      psychologicalAnalysis: pipelineResult.psychologicalAnalysis || null,
      provider: pipelineResult.provider || null,
      generatedAt: new Date(),
    };

    await dream.save();

    memoryService.updateOnReinterpret(req.userId);

    return successResponse(res, {
      message: 'Interpretação atualizada com sucesso',
      dream,
    });
  } catch (error) {
    next(error);
  }
};

const updateDream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { textoSonho, sono } = req.body;

    const dream = await Dream.findOne({ _id: id, userId: req.userId });
    if (!dream) {
      return errorResponse(res, 'Sonho não encontrado', 404);
    }

    if (textoSonho !== undefined) {
      if (!textoSonho.trim()) {
        return errorResponse(res, 'textoSonho is required', 400);
      }
      dream.textoSonho = textoSonho;
    }

    if (sono !== undefined) {
      dream.sono = {
        horaDormir: sono.horaDormir || undefined,
        horaAcordar: sono.horaAcordar || undefined,
        duracaoHoras: sono.horaDormir && sono.horaAcordar
          ? calculateDuration(sono.horaDormir, sono.horaAcordar)
          : undefined,
      };
    }

    await dream.save();

    return successResponse(res, {
      message: 'Sonho atualizado com sucesso.',
      dream,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createDream, getDreams, deleteDream, searchDreamsByDate, generateImage, reinterpretDream, updateDream };
