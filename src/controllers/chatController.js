const mongoose = require('mongoose');
const chatService = require('../services/chatService');
const { successResponse, errorResponse } = require('../utils/response');

exports.sendMessage = async (req, res, next) => {
  try {
    const { message, conversationId, newConversation, contextType, dreamId, emotionId } = req.body;
    console.log('[INVESTIGATION] chatController.sendMessage body=', { message: message?.substring(0, 50), conversationId, newConversation, contextType, dreamId, emotionId, userId: req.userId });

    if (!message || !message.trim()) {
      return errorResponse(res, 'A mensagem é obrigatória.', 400);
    }

    if (message.length > 1000) {
      return errorResponse(res, 'A mensagem deve ter no máximo 1000 caracteres.', 400);
    }

    if (conversationId && !mongoose.Types.ObjectId.isValid(conversationId)) {
      return errorResponse(res, 'ID da conversa inválido.', 400);
    }

    const result = await chatService.sendChat(req.userId, message.trim(), {
      conversationId: conversationId || null,
      newConversation: !!newConversation,
      contextType,
      dreamId,
      emotionId,
    });

    console.log('[INVESTIGATION] chatController.sendChat result=', { answerLength: result.answer?.length, conversationId: result.conversationId });
    successResponse(res, result, 200);
  } catch (error) {
    console.log('[INVESTIGATION] chatController.sendChat ERROR=', error.message, 'stack=', error.stack?.substring(0, 300));
    next(error);
  }
};

exports.listConversations = async (req, res, next) => {
  try {
    const conversations = await chatService.listConversations(req.userId);
    successResponse(res, { conversations });
  } catch (error) {
    next(error);
  }
};

exports.getConversation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'ID da conversa inválido.', 400);
    }

    const messages = await chatService.getConversation(req.userId, id);

    if (!messages.length) {
      return errorResponse(res, 'Conversa não encontrada.', 404);
    }

    successResponse(res, { messages });
  } catch (error) {
    next(error);
  }
};

exports.updateTitle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'ID da conversa inválido.', 400);
    }

    if (!title || !title.trim()) {
      return errorResponse(res, 'O título é obrigatório.', 400);
    }

    const result = await chatService.updateConversationTitle(req.userId, id, title.trim());
    successResponse(res, result);
  } catch (error) {
    if (error.message.includes('não pode estar vazio') || error.message.includes('no máximo')) {
      return errorResponse(res, error.message, 400);
    }
    if (error.message.includes('não encontrada')) {
      return errorResponse(res, error.message, 404);
    }
    next(error);
  }
};

exports.deleteConversation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'ID da conversa inválido.', 400);
    }

    const result = await chatService.deleteConversation(req.userId, id);
    successResponse(res, result);
  } catch (error) {
    if (error.message.includes('não encontrada')) {
      return errorResponse(res, error.message, 404);
    }
    next(error);
  }
};
