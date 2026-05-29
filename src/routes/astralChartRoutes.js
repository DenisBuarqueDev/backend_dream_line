const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
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

router.post('/generate', authMiddleware, generateAstralChart);
router.get('/', authMiddleware, getAstralCharts);
router.get('/:id', authMiddleware, getAstralChartById);
router.delete('/:id', authMiddleware, deleteAstralChart);

router.get('/:id/transits', authMiddleware, getTransits);
router.get('/:id/transits/weekly', authMiddleware, getWeeklyTransits);
router.get('/:id/transits/date', authMiddleware, getTransitsForDate);
router.get('/:id/transits/metadata', authMiddleware, getTransitMetadata);
router.post('/:id/transits/save', authMiddleware, savePrediction);
router.get('/:id/transits/saved', authMiddleware, getSavedPredictions);

module.exports = router;