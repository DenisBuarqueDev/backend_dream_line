const EmotionJournal = require('../models/EmotionJournal');
const EmotionConversation = require('../models/EmotionConversation');
const emotionAnalysisService = require('../services/emotionAnalysisService');
const { successResponse, errorResponse } = require('../utils/response');
const memoryService = require('../services/memoryService');

exports.createEmotion = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return errorResponse(res, 'O texto do sentimento é obrigatório.', 400);
    }

    const User = require('../models/User');
    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado', 404);
    }

    if (user.checkExpiry()) {
      await user.save();
    }

    const incremented = await user.incrementEmotionAnalysisCount();
    if (!incremented) {
      return errorResponse(res, 'Limite de análises emocionais diárias atingido', 403);
    }

    const analysis = await emotionAnalysisService.analyzeEmotion(text.trim());

    const emotion = await EmotionJournal.create({
      userId: req.userId,
      originalText: text.trim(),
      emotion: analysis.emotion,
      intensity: analysis.intensity,
      causes: analysis.causes,
      advice: analysis.advice,
      aiSummary: analysis.aiSummary,
    });

    memoryService.updateOnNewEmotion(req.userId, emotion);

    successResponse(res, { emotion, analysis }, 201);
  } catch (error) {
    next(error);
  }
};

exports.getEmotions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId: req.userId };

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

    const [emotions, total] = await Promise.all([
      EmotionJournal.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmotionJournal.countDocuments(filter),
    ]);

    successResponse(res, {
      emotions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getEmotionById = async (req, res, next) => {
  try {
    const emotion = await EmotionJournal.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!emotion) {
      return errorResponse(res, 'Registro emocional não encontrado.', 404);
    }

    successResponse(res, { emotion });
  } catch (error) {
    next(error);
  }
};

exports.deleteEmotion = async (req, res, next) => {
  try {
    const emotion = await EmotionJournal.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!emotion) {
      return errorResponse(res, 'Registro emocional não encontrado.', 404);
    }

    await EmotionConversation.deleteMany({ emotionId: req.params.id });

    successResponse(res, { message: 'Registro emocional removido.' });
  } catch (error) {
    next(error);
  }
};

exports.sendChatMessage = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return errorResponse(res, 'A mensagem é obrigatória.', 400);
    }

    const emotion = await EmotionJournal.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!emotion) {
      return errorResponse(res, 'Registro emocional não encontrado.', 404);
    }

    let conversation = await EmotionConversation.findOne({
      emotionId: req.params.id,
      userId: req.userId,
    });

    if (!conversation) {
      conversation = await EmotionConversation.create({
        userId: req.userId,
        emotionId: req.params.id,
        messages: [],
      });
    }

    conversation.messages.push({
      role: 'user',
      content: message.trim(),
    });

    const recentHistory = await EmotionJournal.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const aiResponse = await emotionAnalysisService.chatWithAI(
      emotion,
      recentHistory,
      conversation.messages
    );

    conversation.messages.push({
      role: 'assistant',
      content: aiResponse,
    });

    await conversation.save();

    successResponse(res, {
      message: aiResponse,
      messages: conversation.messages,
    });
  } catch (error) {
    next(error);
  }
};

exports.getConversation = async (req, res, next) => {
  try {
    const conversation = await EmotionConversation.findOne({
      emotionId: req.params.id,
      userId: req.userId,
    });

    successResponse(res, {
      messages: conversation ? conversation.messages : [],
    });
  } catch (error) {
    next(error);
  }
};
