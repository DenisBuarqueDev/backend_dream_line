const express = require('express');
const router = express.Router();
const {
  create, list, getById, update, remove, addDream, removeDream,
} = require('../controllers/collectionController');
const protect = require('../middleware/authMiddleware');

router.post('/', protect, create);
router.get('/', protect, list);
router.get('/:id', protect, getById);
router.put('/:id', protect, update);
router.delete('/:id', protect, remove);
router.post('/:id/dreams', protect, addDream);
router.delete('/:id/dreams', protect, removeDream);

module.exports = router;
