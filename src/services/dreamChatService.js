const Dream = require('../models/Dream');
const ChatMessage = require('../models/ChatMessage');
const chatService = require('./chatService');

async function sendMessage(userId, dreamId, question) {
  console.log('[INV] dreamChatService.sendMessage userId=', userId, 'dreamId=', dreamId, 'question=', question?.substring(0, 50));
  const dream = await Dream.findOne({ _id: dreamId, userId }).lean();
  if (!dream) {
    console.log('[INV] dreamChatService.sendMessage DREAM NOT FOUND dreamId=', dreamId);
    throw new Error('Sonho não encontrado.');
  }
  console.log('[INV] dreamChatService.sendMessage dreamFound=', !!dream);

  const result = await chatService.sendChat(userId, question, {
    conversationId: dreamId,
    newConversation: false,
    contextType: 'dream',
    dreamId,
  });

  console.log('[INV] dreamChatService.sendMessage resultConversationId=', result.conversationId, 'answerLength=', result.answer?.length);
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
