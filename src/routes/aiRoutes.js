const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const User = require('../models/User');
const aiGateway = require('../services/ai/aiGatewayService');

router.post('/interpret', protect, async (req, res, next) => {
  try {
    const { dreamText, generateImage, psychologicalAnalysis, sunSign, moonSign, ascendant } = req.body;

    if (!dreamText) {
      return res.status(400).json({ error: 'dreamText é obrigatório' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.checkExpiry()) {
      await user.save();
    }

    const incremented = await user.incrementInterpretationCount();
    if (!incremented) {
      return res.status(403).json({ success: false, error: 'Limite de interpretações diárias atingido', code: 'INTERPRETATION_LIMIT_REACHED' });
    }

    const userContext = { sunSign, moonSign, ascendant };

    const result = await aiGateway.processDreamPipeline(dreamText, userContext, {
      generateImage: generateImage || false,
      psychologicalAnalysis: psychologicalAnalysis || false,
    });

    res.json({ ...result, planInfo: user.checkUserPlan() });
  } catch (error) {
    next(error);
  }
});

router.get('/status', protect, (req, res) => {
  const routing = aiGateway.getRoutingInfo();
  res.json(routing);
});

module.exports = router;
