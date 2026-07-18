const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');
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
router.get('/weekly', authMiddleware, checkFeatureAccess('weekly_summary'), getWeeklyEnergy);
router.get('/astrology', authMiddleware, checkFeatureAccess('astral_chart'), getAstrologyOnly);
router.get('/numerology', authMiddleware, checkFeatureAccess('numerology'), getNumerologyOnly);
router.get('/sleep', authMiddleware, checkFeatureAccess('sleep_mode'), getSleepOnly);
router.get('/emotions', authMiddleware, getEmotionsOnly);
router.get('/recommendations', authMiddleware, getRecommendationsOnly);

module.exports = router;