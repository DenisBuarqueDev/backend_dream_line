const express = require('express');
const router = express.Router();
const { createDream, getDreams, getDreamById, deleteDream, searchDreamsByDate, generateImage, reinterpretDream, updateDream } = require('../controllers/dreamController');
const protect = require('../middleware/authMiddleware');

const { checkFeatureAccess } = require('../middleware/planMiddleware');

router.post('/', protect, createDream);
router.get('/', protect, getDreams);
router.get('/search', protect, searchDreamsByDate);
router.get('/:id', protect, getDreamById);
router.post('/:id/image', protect, checkFeatureAccess('generate_image'), generateImage);
router.post('/:id/reinterpret', protect, reinterpretDream);
router.put('/:id', protect, updateDream);
router.delete('/:id', protect, checkFeatureAccess('delete_dream'), deleteDream);

module.exports = router;