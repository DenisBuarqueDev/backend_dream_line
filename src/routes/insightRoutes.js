const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');
const { getIntelligence } = require('../controllers/insightController');

router.get('/intelligence', protect, checkFeatureAccess('emotion_insights'), getIntelligence);

module.exports = router;
