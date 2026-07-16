const mongoose = require('mongoose');
const dreamChatService = require('../services/dreamChatService');
const { successResponse, errorResponse } = require('../utils/response');

exports.sendMessage = async (req, res, next) => {
  try {
    const { dreamId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return errorResponse(res, 'A mensagem é obrigatória.', 400);
    }

    if (message.length > 1000) {
      return errorResponse(res, 'A mensagem deve ter no máximo 1000 caracteres.', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(dreamId)) {
      return errorResponse(res, 'ID do sonho inválido.', 400);
    }

    console.log('[INV] dreamChatController.sendMessage calling service userId=', req.userId, 'dreamId=', dreamId, 'message=', message?.substring(0, 50));
    const result = await dreamChatService.sendMessage(req.userId, dreamId, message.trim());
    console.log('[INV] dreamChatController.sendMessage result=', { answerLength: result.answer?.length, conversationId: result.conversationId });
    successResponse(res, result, 200);
  } catch (error) {
    console.log('[INV] dreamChatController.sendMessage ERROR=', error.message, 'stack=', error.stack?.substring(0, 300));
    if (error.message === 'Sonho não encontrado.') {
      return errorResponse(res, error.message, 404);
    }
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { dreamId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(dreamId)) {
      return errorResponse(res, 'ID do sonho inválido.', 400);
    }

    const messages = await dreamChatService.getHistory(req.userId, dreamId);
    successResponse(res, { messages });
  } catch (error) {
    next(error);
  }
};
