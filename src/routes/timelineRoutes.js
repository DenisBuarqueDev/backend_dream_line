const express = require('express');
const router = express.Router();
const { getTimeline } = require('../controllers/timelineController');
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');

router.get('/', protect, checkFeatureAccess('timeline'), getTimeline);

module.exports = router;
