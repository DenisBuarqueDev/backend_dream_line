const express = require('express');
const router = express.Router();
const { getReport } = require('../controllers/reportController');
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');

router.get('/', protect, checkFeatureAccess('life_insights'), getReport);

module.exports = router;
