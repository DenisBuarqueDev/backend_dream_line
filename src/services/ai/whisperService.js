const OpenAI = require('openai');
const fs = require('fs-extra');
const path = require('path');
const { AI_PROVIDERS } = require('../../config/aiProviders');

const EXT_TO_MIME = {
  webm: 'audio/webm',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  mpga: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
};

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  console.log('Groq Whisper online');
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

async function transcribeAudio(filePath) {
  const errors = [];

  try {
    const result = await transcribeWithWhisper(filePath);
    if (result) return result;
  } catch (error) {
    console.error('Groq Whisper error:', error.message);
    errors.push({ provider: 'groq-whisper', error: error.message });
  }

  return {
    text: '',
    error: errors.map(e => `${e.provider}: ${e.error}`).join('; '),
    fallback: true,
  };
}

async function transcribeWithWhisper(filePath) {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error('GROQ_API_KEY não configurada');
  }

  if (!(await fs.pathExists(filePath))) {
    throw new Error('Arquivo de áudio não encontrado');
  }

  const stats = await fs.stat(filePath);
  console.log('📤 Groq Whisper: enviando áudio', {
    path: filePath,
    size: stats.size,
    model: AI_PROVIDERS.whisper.primary.model,
  });

  const ext = path.extname(filePath).toLowerCase().replace('.', '') || 'webm';
  const mimeType = EXT_TO_MIME[ext] || 'audio/webm';
  console.log('📤 Groq Whisper: enviando arquivo', { ext, mimeType, path: filePath });

  const startTime = Date.now();
  const transcription = await groq.audio.transcriptions.create({
    file: await OpenAI.toFile(fs.createReadStream(filePath), `transcription.${ext}`, { type: mimeType }),
    model: AI_PROVIDERS.whisper.primary.model,
    language: 'pt',
    response_format: 'text',
  });
  const elapsed = Date.now() - startTime;

  console.log(`📥 Groq Whisper: transcrição recebida em ${elapsed}ms`);

  const text = transcription.trim();
  if (!text) {
    throw new Error('Transcrição retornou texto vazio');
  }

  console.log(`📝 Texto transcrito (${text.length} chars):`, text.substring(0, 100));

  return { text, provider: 'groq-whisper' };
}

async function executeWithRetry(filePath, retries = AI_PROVIDERS.whisper.retries) {
  const delay = AI_PROVIDERS.whisper.retryDelay;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await transcribeWithWhisper(filePath);
    } catch (error) {
      console.error('Groq Whisper error:', error.message);
      if (attempt === retries) throw error;
      const wait = delay * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
}

async function transcribeAudioWithRetry(filePath) {
  try {
    return await executeWithRetry(filePath);
  } catch (error) {
    console.error('Groq Whisper error:', error.message);
    return { text: '', error: error.message, fallback: true };
  }
}

function sanitizeFileName(originalName) {
  return originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getBaseMimeType(mimetype) {
  return (mimetype || '').split(';')[0].trim();
}

function getExtensionFromMime(mimetype) {
  const base = getBaseMimeType(mimetype);
  return EXT_TO_MIME[Object.keys(EXT_TO_MIME).find(k => EXT_TO_MIME[k] === base)] || 'webm';
}

function validateAudioFile(mimetype, originalName, size) {
  const config = AI_PROVIDERS.whisper;
  const baseMime = getBaseMimeType(mimetype);
  const isAllowedMime = config.allowedFormats.includes(baseMime) || config.allowedFormats.includes(mimetype);
  const isAllowedExt = /\.(webm|mp4|mpeg|wav|ogg|mp3|m4a|opus|flac|aac)$/i.test(originalName);

  if (!isAllowedMime && !isAllowedExt) {
    return { valid: false, error: 'Formato de áudio não suportado' };
  }

  if (size > config.maxFileSize) {
    return { valid: false, error: 'Arquivo muito grande. Máximo 25MB.' };
  }

  return { valid: true };
}

module.exports = {
  transcribeAudio,
  transcribeAudioWithRetry,
  transcribeWithWhisper,
  validateAudioFile,
  sanitizeFileName,
  getGroqClient,
  getBaseMimeType,
  getExtensionFromMime,
};
