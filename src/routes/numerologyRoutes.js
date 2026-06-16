const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');
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

router.get('/daily', authMiddleware, checkFeatureAccess('numerology'), getDailyNumerology);
router.get('/life-path', authMiddleware, checkFeatureAccess('numerology'), getLifePath);
router.get('/personal', authMiddleware, checkFeatureAccess('numerology'), getPersonalNumber);
router.get('/universal', getUniversalDayNumber);
router.get('/year', authMiddleware, checkFeatureAccess('numerology'), getYearNumber);
router.get('/month', authMiddleware, checkFeatureAccess('numerology'), getMonthNumber);
router.get('/compatibility', authMiddleware, checkFeatureAccess('numerology'), getCompatibility);
router.get('/interpretations', getInterpretations);

module.exports = router;