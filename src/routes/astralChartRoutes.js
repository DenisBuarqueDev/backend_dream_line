const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');
const { 
  generateAstralChart, 
  getAstralCharts, 
  getAstralChartById,
  deleteAstralChart 
} = require('../controllers/astralChartController');
const {
  getTransits,
  getWeeklyTransits,
  getTransitsForDate,
  savePrediction,
  getSavedPredictions,
  getTransitMetadata
} = require('../controllers/transitController');

router.post('/generate', authMiddleware, checkFeatureAccess('astral_chart'), generateAstralChart);
router.get('/', authMiddleware, checkFeatureAccess('astral_chart'), getAstralCharts);
router.get('/:id', authMiddleware, checkFeatureAccess('astral_chart'), getAstralChartById);
router.delete('/:id', authMiddleware, checkFeatureAccess('astral_chart'), deleteAstralChart);

router.get('/:id/transits', authMiddleware, checkFeatureAccess('astral_chart'), getTransits);
router.get('/:id/transits/weekly', authMiddleware, checkFeatureAccess('astral_chart'), getWeeklyTransits);
router.get('/:id/transits/date', authMiddleware, checkFeatureAccess('astral_chart'), getTransitsForDate);
router.get('/:id/transits/metadata', authMiddleware, checkFeatureAccess('astral_chart'), getTransitMetadata);
router.post('/:id/transits/save', authMiddleware, checkFeatureAccess('astral_chart'), savePrediction);
router.get('/:id/transits/saved', authMiddleware, checkFeatureAccess('astral_chart'), getSavedPredictions);

module.exports = router;