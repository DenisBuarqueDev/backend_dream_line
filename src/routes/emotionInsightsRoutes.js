const express = require('express');
const router = express.Router();
const { getInsights, getStats } = require('../controllers/emotionInsightsController');
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');

router.get('/insights', protect, checkFeatureAccess('emotion_insights'), getInsights);
router.get('/stats', protect, checkFeatureAccess('emotion_insights'), getStats);

module.exports = router;
