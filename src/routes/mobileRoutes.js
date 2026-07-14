const express = require('express');
const router = express.Router();
const { generateImageMobile } = require('../controllers/mobileDreamController');
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');

router.post('/dreams/:id/image', protect, checkFeatureAccess('generate_image'), generateImageMobile);

module.exports = router;