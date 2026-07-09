const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { getIntelligence } = require('../controllers/insightController');

router.get('/intelligence', protect, getIntelligence);

module.exports = router;
