const express = require('express');
const router = express.Router();
const { getToday, create } = require('../controllers/dailyCheckinController');
const protect = require('../middleware/authMiddleware');

router.get('/', protect, getToday);
router.post('/', protect, create);

module.exports = router;
