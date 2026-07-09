const express = require('express');
const router = express.Router();
const { getCoachReport } = require('../controllers/dreamCoachController');
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');

router.get('/', protect, checkFeatureAccess('dream_coach'), getCoachReport);

module.exports = router;
