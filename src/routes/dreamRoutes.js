const express = require('express');
const router = express.Router();
const { createDream, getDreams, deleteDream, searchDreamsByDate, generateImage } = require('../controllers/dreamController');
const protect = require('../middleware/authMiddleware');

router.post('/', protect, createDream);
router.get('/', protect, getDreams);
router.get('/search', protect, searchDreamsByDate);
router.post('/:id/image', protect, generateImage);
router.delete('/:id', protect, deleteDream);

module.exports = router;