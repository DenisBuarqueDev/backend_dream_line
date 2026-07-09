const express = require('express');
const router = express.Router();
const { getHomeCompanion, markAsViewed } = require('../controllers/homeCompanionController');
const protect = require('../middleware/authMiddleware');

router.get('/', protect, getHomeCompanion);
router.patch('/view', protect, markAsViewed);

module.exports = router;
