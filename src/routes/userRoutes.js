const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const User = require('../models/User');
const { upgradePlan, getCurrentPlan } = require('../controllers/planController');

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    const planInfo = user.checkUserPlan();
    res.json({ 
      ...user.toObject(), 
      planInfo: {
        remainingDreams: planInfo.remainingDreams,
        maxDreams: planInfo.maxDreams,
        canGenerateImage: planInfo.canGenerateImage,
        canUseSleepMode: planInfo.canUseSleepMode,
        canSeeWeeklySummary: planInfo.canSeeWeeklySummary
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/upgrade', protect, upgradePlan);
router.get('/plan', protect, getCurrentPlan);

module.exports = router;