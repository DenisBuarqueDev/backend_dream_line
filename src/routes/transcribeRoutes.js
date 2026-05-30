const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const protect = require('../middleware/authMiddleware');
const whisperService = require('../services/ai/whisperService');

const MIME_TO_EXT_BACKEND = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/x-m4a': 'm4a',
};

const tempDir = path.join(__dirname, '..', '..', 'temp');
fs.ensureDirSync(tempDir);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => {
    const baseMime = whisperService.getBaseMimeType(file.mimetype);
    const ext = MIME_TO_EXT_BACKEND[baseMime] || path.extname(file.originalname).replace('.', '') || 'webm';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${unique}.${ext}`);
  },
});

const upload = multer({
  storage,
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
    console.log('═══════════════════════════════════════');
    console.log('[Transcribe] Arquivo recebido:');
    console.log('  originalname:', req.file.originalname);
    console.log('  mimetype:', req.file.mimetype);
    console.log('  path:', req.file.path);
    console.log('  size:', req.file.size);
    console.log('  saved as:', path.basename(filePath));
    console.log('═══════════════════════════════════════');

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

router.get('/debug', async (_req, res) => {
  const tempExists = await fs.pathExists(tempDir);
  res.json({
    tempDir,
    tempExists,
    config: {
      maxFileSize: '25MB',
      allowedFormats: require('../config/aiProviders').AI_PROVIDERS.whisper.allowedFormats,
    },
  });
});

router.post('/debug', protect, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }
  res.json({
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    path: req.file.path,
    size: req.file.size,
    exists: await fs.pathExists(req.file.path),
    savedAs: path.basename(req.file.path),
  });
});

module.exports = router;
