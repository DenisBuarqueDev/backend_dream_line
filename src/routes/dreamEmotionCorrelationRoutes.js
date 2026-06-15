const express = require('express');
const router = express.Router();
const { getCorrelations } = require('../controllers/dreamEmotionCorrelationController');
const protect = require('../middleware/authMiddleware');

router.get('/correlations', protect, getCorrelations);

module.exports = router;
