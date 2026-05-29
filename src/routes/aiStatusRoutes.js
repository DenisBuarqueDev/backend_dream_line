const express = require('express');
const router = express.Router();

router.get('/diagnostics', async (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    deepseek: process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY ? 'online' : 'offline',
    flux: process.env.FLUX_API_KEY || process.env.REPLICATE_API_KEY || process.env.STABLE_DIFFUSION_API_KEY ? 'online' : 'offline',
    claude: process.env.CLAUDE_API_KEY ? 'online' : 'offline',
    stability: process.env.STABLE_DIFFUSION_API_KEY ? 'online' : 'offline',
    groq_whisper: process.env.GROQ_API_KEY ? 'online' : 'offline',
    web_speech_api: 'disponivel',
    gateway: process.env.USE_AI_GATEWAY === 'true' ? 'online' : 'offline',
    mode: process.env.USE_AI_GATEWAY === 'true' ? 'gateway' : 'legacy',
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
