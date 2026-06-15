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

router.post('/', protect, createEmotion);
router.get('/', protect, getEmotions);
router.get('/:id', protect, getEmotionById);
router.delete('/:id', protect, deleteEmotion);
router.post('/:id/chat', protect, sendChatMessage);
router.get('/:id/chat', protect, getConversation);

module.exports = router;
