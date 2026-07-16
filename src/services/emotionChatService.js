const EmotionJournal = require('../models/EmotionJournal');
const ChatMessage = require('../models/ChatMessage');
const chatService = require('./chatService');

async function sendMessage(userId, emotionId, question) {
  const emotion = await EmotionJournal.findOne({ _id: emotionId, userId }).lean();
  if (!emotion) {
    throw new Error('Emoção não encontrada.');
  }

  const result = await chatService.sendChat(userId, question, {
    conversationId: emotionId,
    newConversation: false,
    contextType: 'emotion',
    emotionId,
  });

  return result;
}

async function getHistory(userId, emotionId) {
  const messages = await ChatMessage.find({
    userId,
    contextType: 'emotion',
    emotionId,
  })
    .sort({ messageIndex: 1 })
    .select('question answer messageIndex createdAt')
    .lean();

  return messages;
}

module.exports = { sendMessage, getHistory };
