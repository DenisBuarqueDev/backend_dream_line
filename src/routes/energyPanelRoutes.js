const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getEnergyOfTheDay,
  getWeeklyEnergy,
  getAstrologyOnly,
  getNumerologyOnly,
  getSleepOnly,
  getEmotionsOnly,
  getRecommendationsOnly
} = require('../controllers/energyPanelController');

router.get('/today', authMiddleware, getEnergyOfTheDay);
router.get('/weekly', authMiddleware, getWeeklyEnergy);
router.get('/astrology', authMiddleware, getAstrologyOnly);
router.get('/numerology', authMiddleware, getNumerologyOnly);
router.get('/sleep', authMiddleware, getSleepOnly);
router.get('/emotions', authMiddleware, getEmotionsOnly);
router.get('/recommendations', authMiddleware, getRecommendationsOnly);

module.exports = router;