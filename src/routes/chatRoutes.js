const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const dreamChatController = require('../controllers/dreamChatController');
const emotionChatController = require('../controllers/emotionChatController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, chatController.sendMessage);
router.get('/conversations', authMiddleware, chatController.listConversations);
router.get('/conversations/:id', authMiddleware, chatController.getConversation);
router.patch('/conversations/:id', authMiddleware, chatController.updateTitle);
router.delete('/conversations/:id', authMiddleware, chatController.deleteConversation);

router.post('/dream/:dreamId', authMiddleware, dreamChatController.sendMessage);
router.get('/dream/:dreamId', authMiddleware, dreamChatController.getHistory);

router.post('/emotion/:emotionId', authMiddleware, emotionChatController.sendMessage);
router.get('/emotion/:emotionId', authMiddleware, emotionChatController.getHistory);

module.exports = router;
