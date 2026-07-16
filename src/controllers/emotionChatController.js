const mongoose = require('mongoose');
const emotionChatService = require('../services/emotionChatService');
const { successResponse, errorResponse } = require('../utils/response');

exports.sendMessage = async (req, res, next) => {
  try {
    const { emotionId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return errorResponse(res, 'A mensagem é obrigatória.', 400);
    }

    if (message.length > 1000) {
      return errorResponse(res, 'A mensagem deve ter no máximo 1000 caracteres.', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(emotionId)) {
      return errorResponse(res, 'ID da emoção inválido.', 400);
    }

    const result = await emotionChatService.sendMessage(req.userId, emotionId, message.trim());
    successResponse(res, result, 200);
  } catch (error) {
    if (error.message === 'Emoção não encontrada.') {
      return errorResponse(res, error.message, 404);
    }
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { emotionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(emotionId)) {
      return errorResponse(res, 'ID da emoção inválido.', 400);
    }

    const messages = await emotionChatService.getHistory(req.userId, emotionId);
    successResponse(res, { messages });
  } catch (error) {
    next(error);
  }
};
