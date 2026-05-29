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
  const startTime = Date.now();
  try {
    if (!req.file) {
      console.error('[Transcribe] Nenhum arquivo enviado');
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado' });
    }

    filePath = req.file.path;
    console.log('[Transcribe] Arquivo recebido:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: filePath,
    });

    const result = await whisperService.transcribeAudio(filePath);

    const elapsed = Date.now() - startTime;
    console.log(`[Transcribe] Resultado em ${elapsed}ms:`, {
      provider: result.provider,
      textLength: result.text?.length || 0,
      hasText: !!result.text,
    });

    await fs.remove(filePath);
    filePath = null;

    if (result.fallback && !result.text) {
      console.error('[Transcribe] Fallback sem texto:', result.error);
      return res.status(500).json({ error: result.error || 'Erro ao transcrever áudio' });
    }

    res.json({ text: result.text, provider: result.provider || 'whisper' });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[Transcribe] Erro em ${elapsed}ms:`, err.message);
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Arquivo muito grande. Máximo 25MB.' });
      }
      return res.status(400).json({ error: err.message });
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
  } finally {
    if (filePath) {
      try { await fs.remove(filePath); } catch (_) { /* ignore */ }
    }
  }
});

module.exports = router;
