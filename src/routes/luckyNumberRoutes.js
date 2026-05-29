const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getLuckyNumbers,
  getSingleGame,
  getGamesInfo,
  regenerateSingleGame
} = require('../controllers/luckyNumberController');

router.get('/', authMiddleware, getLuckyNumbers);
router.get('/games', authMiddleware, getSingleGame);
router.get('/info', getGamesInfo);
router.post('/regenerate/:game', authMiddleware, regenerateSingleGame);

module.exports = router;