const express = require('express');
const router = express.Router();
const { getInsights, getStats } = require('../controllers/emotionInsightsController');
const protect = require('../middleware/authMiddleware');

router.get('/insights', protect, getInsights);
router.get('/stats', protect, getStats);

module.exports = router;
