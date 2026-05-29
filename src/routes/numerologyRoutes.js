const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getDailyNumerology,
  getLifePath,
  getPersonalNumber,
  getUniversalDayNumber,
  getYearNumber,
  getMonthNumber,
  getCompatibility,
  getInterpretations
} = require('../controllers/numerologyController');

router.get('/daily', authMiddleware, getDailyNumerology);
router.get('/life-path', authMiddleware, getLifePath);
router.get('/personal', authMiddleware, getPersonalNumber);
router.get('/universal', getUniversalDayNumber);
router.get('/year', authMiddleware, getYearNumber);
router.get('/month', authMiddleware, getMonthNumber);
router.get('/compatibility', authMiddleware, getCompatibility);
router.get('/interpretations', getInterpretations);

module.exports = router;