const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { createSubscription, getStatus } = require('../controllers/subscriptionController');

router.post('/subscribe', protect, createSubscription);
router.get('/status', protect, getStatus);

module.exports = router;
