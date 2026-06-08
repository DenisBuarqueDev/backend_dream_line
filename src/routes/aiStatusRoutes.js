const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');

const { testDeepSeek } = require('../tests/ai/testDeepSeek');
const { testFlux } = require('../tests/ai/testFlux');
const { testClaude } = require('../tests/ai/testClaude');
const { testStability } = require('../tests/ai/testStability');
const { testWhisper } = require('../tests/ai/testWhisper');

router.get('/test-all', protect, async (req, res) => {
  const start = Date.now();

  const results = await Promise.allSettled([
    testDeepSeek(),
    testFlux(),
    testClaude(),
    testStability(),
    testWhisper(),
  ]);

  const tests = {
    deepseek: results[0].status === 'fulfilled' ? results[0].value.status : 'offline',
    flux: results[1].status === 'fulfilled' ? results[1].value.status : 'offline',
    claude: results[2].status === 'fulfilled' ? results[2].value.status : 'offline',
    stability: results[3].status === 'fulfilled' ? results[3].value.status : 'offline',
    groq: results[4].status === 'fulfilled' ? results[4].value.status : 'offline',
  };

  res.json({
    timestamp: new Date().toISOString(),
    elapsed: Date.now() - start,
    ...tests,
  });
});

router.get('/diagnostics', protect, async (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    deepseek: process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY ? 'online' : 'offline',
    flux: process.env.FLUX_API_KEY || process.env.REPLICATE_API_KEY || process.env.STABLE_DIFFUSION_API_KEY ? 'online' : 'offline',
    claude: process.env.CLAUDE_API_KEY ? 'online' : 'offline',
    stability: process.env.STABLE_DIFFUSION_API_KEY ? 'online' : 'offline',
    groq_whisper: process.env.GROQ_API_KEY ? 'online' : 'offline',
    web_speech_api: 'disponivel',
    gateway: 'online',
    mode: 'gateway',
  };

  const allOnline = Object.values(status).every(v => v === 'online' || v === 'disponivel');

  const notes = [];
  if (!process.env.DEEPSEEK_API_KEY && !process.env.AI_API_KEY) notes.push('DEEPSEEK_API_KEY ausente');
  if (!process.env.GROQ_API_KEY) notes.push('GROQ_API_KEY ausente');

  res.json({
    status: allOnline ? 'online' : 'parcial',
    ...status,
    notes: notes.length > 0 ? notes : ['Todas as APIs configuradas'],
  });
});

module.exports = router;
