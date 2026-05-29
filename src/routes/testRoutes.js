const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const protect = require('../middleware/authMiddleware');
const whisperService = require('../services/ai/whisperService');
const { testDeepSeek } = require('../tests/ai/testDeepSeek');
const { testFlux } = require('../tests/ai/testFlux');
const { testClaude } = require('../tests/ai/testClaude');
const { testStability } = require('../tests/ai/testStability');
const { testWhisper } = require('../tests/ai/testWhisper');
const { testGateway } = require('../tests/ai/testGateway');

const upload = multer({
  dest: path.join(__dirname, '..', '..', 'temp'),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a', 'audio/x-m4a'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(webm|mp4|mpeg|wav|ogg|mp3|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de áudio não suportado'));
    }
  },
});

const tempDir = path.join(__dirname, '..', '..', 'tmp', 'tests');

router.post('/whisper', protect, upload.single('audio'), async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado' });
    }

    filePath = req.file.path;
    await fs.ensureDir(tempDir);
    const testPath = path.join(tempDir, 'test_audio.webm');
    await fs.copy(filePath, testPath);

    const result = await whisperService.transcribeAudio(filePath);

    await fs.remove(filePath);
    filePath = null;

    if (result.fallback && !result.text) {
      return res.status(500).json({ error: result.error || 'Erro ao transcrever áudio' });
    }

    res.json({
      success: true,
      text: result.text,
      provider: result.provider || 'groq-whisper',
      message: 'Áudio salvo para testes em tmp/tests/test_audio.webm',
    });
  } catch (err) {
    console.error('Erro no teste Groq Whisper:', err.message);
    if (filePath) await fs.remove(filePath).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', protect, async (req, res) => {
  try {
    const results = await Promise.allSettled([
      testDeepSeek(),
      testFlux(),
      testClaude(),
      testStability(),
      testWhisper(),
      testGateway(),
    ]);

    const tests = {
      deepseek: results[0].status === 'fulfilled' ? results[0].value : { status: 'offline', error: results[0].reason?.message },
      flux: results[1].status === 'fulfilled' ? results[1].value : { status: 'offline', error: results[1].reason?.message },
      claude: results[2].status === 'fulfilled' ? results[2].value : { status: 'offline', error: results[2].reason?.message },
      stability: results[3].status === 'fulfilled' ? results[3].value : { status: 'offline', error: results[3].reason?.message },
      'groq-whisper': results[4].status === 'fulfilled' ? results[4].value : { status: 'offline', error: results[4].reason?.message },
      gateway: results[5].status === 'fulfilled' ? results[5].value : { status: 'offline', error: results[5].reason?.message },
    };

    const allOnline = Object.values(tests).every(t => t.status === 'online');

    res.json({
      timestamp: new Date().toISOString(),
      overall: allOnline ? 'online' : 'parcial',
      tests,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:provider', protect, async (req, res) => {
  const { provider } = req.params;
  const testMap = {
    deepseek: testDeepSeek,
    flux: testFlux,
    claude: testClaude,
    stability: testStability,
    whisper: testWhisper,
    'groq-whisper': testWhisper,
    gateway: testGateway,
  };

  const testFn = testMap[provider];
  if (!testFn) {
    return res.status(400).json({ error: `Provider desconhecido: ${provider}. Opções: ${Object.keys(testMap).join(', ')}` });
  }

  try {
    const result = await testFn();
    res.json(result);
  } catch (error) {
    res.status(500).json({ provider, status: 'offline', error: error.message });
  }
});

module.exports = router;
