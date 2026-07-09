const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, chatController.sendMessage);
router.get('/conversations', authMiddleware, chatController.listConversations);
router.get('/conversations/:id', authMiddleware, chatController.getConversation);
router.patch('/conversations/:id', authMiddleware, chatController.updateTitle);
router.delete('/conversations/:id', authMiddleware, chatController.deleteConversation);

module.exports = router;
