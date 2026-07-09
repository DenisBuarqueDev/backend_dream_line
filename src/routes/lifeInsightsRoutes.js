const express = require('express');
const router = express.Router();
const { getLifeInsights } = require('../controllers/lifeInsightsController');
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');

router.get('/', protect, checkFeatureAccess('life_insights'), getLifeInsights);

module.exports = router;
