const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const protect = require('../middleware/authMiddleware');
const whisperService = require('../services/ai/whisperService');

const upload = multer({
  dest: path.join(__dirname, '..', '..', 'temp'),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const validation = whisperService.validateAudioFile(file.mimetype, file.originalname, file.size);
    if (validation.valid) {
      cb(null, true);
    } else {
      cb(new Error(validation.error));
    }
  },
});

router.post('/', protect, upload.single('audio'), async (req, res, next) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado' });
    }

    filePath = req.file.path;

    const result = await whisperService.transcribeAudio(filePath);

    await fs.remove(filePath);
    filePath = null;

    if (result.fallback && !result.text) {
      return res.status(500).json({ error: result.error || 'Erro ao transcrever áudio' });
    }

    res.json({ text: result.text, provider: result.provider || 'whisper' });
  } catch (err) {
    console.error('Erro na transcrição:', err.message);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Arquivo muito grande. Máximo 25MB.' });
    }

    if (err.status === 413) {
      return res.status(413).json({ error: 'Arquivo muito grande para a API Groq.' });
    }

    if (err.status === 401 || err.status === 403) {
      return res.status(500).json({ error: 'Erro de autenticação com a API de IA.' });
    }

    if (err.status === 429) {
      return res.status(429).json({ error: 'Muitas requisições. Tente novamente em alguns segundos.' });
    }

    res.status(err.status || 500).json({
      error: err.message || 'Erro ao transcrever áudio',
    });
  } finally {
    if (filePath) {
      try { await fs.remove(filePath); } catch (_) { /* ignore */ }
    }
  }
});

module.exports = router;
