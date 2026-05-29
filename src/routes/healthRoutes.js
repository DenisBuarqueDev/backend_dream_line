const express = require('express');
const router = express.Router();

router.get('/ai', async (req, res) => {
  const health = {
    timestamp: new Date().toISOString(),
    deepseek: 'offline',
    flux: 'offline',
    claude: 'offline',
    stability: 'offline',
    whisper: 'offline',
    groq_whisper: 'offline',
    gateway: 'online',
  };

  const checks = [];

  if (process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY) {
    health.deepseek = 'online';
  } else {
    health.deepseek = 'offline';
    checks.push('DEEPSEEK_API_KEY ausente');
  }

  if (process.env.FLUX_API_KEY || process.env.REPLICATE_API_KEY || process.env.STABLE_DIFFUSION_API_KEY) {
    health.flux = 'online';
  } else {
    health.flux = 'offline';
    checks.push('FLUX/Stability API key ausente');
  }

  if (process.env.CLAUDE_API_KEY) {
    health.claude = 'online';
  } else {
    health.claude = 'offline';
    checks.push('CLAUDE_API_KEY ausente');
  }

  if (process.env.STABLE_DIFFUSION_API_KEY) {
    health.stability = 'online';
  }

  if (process.env.GROQ_API_KEY) {
    health.groq_whisper = 'online';
  } else {
    health.groq_whisper = 'offline';
    checks.push('GROQ_API_KEY ausente');
  }

  const allOnline = health.deepseek === 'online' || health.flux === 'online' || health.claude === 'online';

  res.json({
    status: allOnline ? 'online' : 'offline',
    ...health,
    notes: checks.length > 0 ? checks : ['Todas as APIs configuradas'],
    mode: 'gateway',
  });
});

module.exports = router;
