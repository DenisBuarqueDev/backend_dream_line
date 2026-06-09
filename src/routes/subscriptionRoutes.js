const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { createCheckout, getStatus } = require('../controllers/subscriptionController');

router.post('/create-checkout', protect, createCheckout);
router.get('/status', protect, getStatus);

module.exports = router;
