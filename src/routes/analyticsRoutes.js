const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');

router.get('/', protect, checkFeatureAccess('life_insights'), getAnalytics);

module.exports = router;
