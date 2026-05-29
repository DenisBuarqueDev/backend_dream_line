const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const aiGateway = require('../services/ai/aiGatewayService');

router.post('/interpret', protect, async (req, res, next) => {
  try {
    const { dreamText, generateImage, psychologicalAnalysis, sunSign, moonSign, ascendant } = req.body;

    if (!dreamText) {
      return res.status(400).json({ error: 'dreamText é obrigatório' });
    }

    const userContext = { sunSign, moonSign, ascendant };

    const result = await aiGateway.processDreamPipeline(dreamText, userContext, {
      generateImage: generateImage || false,
      psychologicalAnalysis: psychologicalAnalysis || false,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/status', protect, (req, res) => {
  const routing = aiGateway.getRoutingInfo();
  res.json(routing);
});

module.exports = router;
