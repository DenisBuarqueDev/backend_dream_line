const Dream = require('../models/Dream');
const ChatMessage = require('../models/ChatMessage');
const chatService = require('./chatService');

async function sendMessage(userId, dreamId, question) {
  const dream = await Dream.findOne({ _id: dreamId, userId }).lean();
  if (!dream) {
    throw new Error('Sonho não encontrado.');
  }

  const result = await chatService.sendChat(userId, question, {
    conversationId: dreamId,
    newConversation: false,
    contextType: 'dream',
    dreamId,
  });

  return result;
}

async function getHistory(userId, dreamId) {
  const messages = await ChatMessage.find({
    userId,
    contextType: 'dream',
    dreamId,
  })
    .sort({ messageIndex: 1 })
    .select('question answer messageIndex createdAt')
    .lean();

  return messages;
}

module.exports = { sendMessage, getHistory };
