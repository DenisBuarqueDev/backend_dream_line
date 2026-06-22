const express = require('express');
const router = express.Router();
const {
  createEmotion,
  getEmotions,
  getEmotionById,
  deleteEmotion,
  sendChatMessage,
  getConversation,
} = require('../controllers/emotionController');
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');

router.post('/', protect, createEmotion);
router.get('/', protect, getEmotions);
router.get('/:id', protect, getEmotionById);
router.delete('/:id', protect, checkFeatureAccess('delete_emotion'), deleteEmotion);
router.post('/:id/chat', protect, checkFeatureAccess('chat_emotional'), sendChatMessage);
router.get('/:id/chat', protect, checkFeatureAccess('chat_emotional'), getConversation);

module.exports = router;
