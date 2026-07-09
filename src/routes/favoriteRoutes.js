const express = require('express');
const router = express.Router();
const { toggle, list, check } = require('../controllers/favoriteController');
const protect = require('../middleware/authMiddleware');

router.post('/toggle', protect, toggle);
router.get('/', protect, list);
router.get('/check/:dreamId', protect, check);

module.exports = router;
