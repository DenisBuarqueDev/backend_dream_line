const express = require('express');
const router = express.Router();
const { getCorrelations } = require('../controllers/dreamEmotionCorrelationController');
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');

router.get('/correlations', protect, checkFeatureAccess('correlations'), getCorrelations);

module.exports = router;
