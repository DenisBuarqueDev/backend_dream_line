const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');
const {
  generate,
  list,
  getById,
  getRemaining
} = require('../controllers/numerologyNameController');

router.post('/generate', protect, checkFeatureAccess('numerology'), generate);
router.get('/', protect, list);
router.get('/remaining', protect, getRemaining);
router.get('/:id', protect, getById);

module.exports = router;
