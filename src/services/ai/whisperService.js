const OpenAI = require('openai');
const fs = require('fs-extra');
const { AI_PROVIDERS } = require('../../config/aiProviders');

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

  const startTime = Date.now();
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
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

function validateAudioFile(mimetype, originalName, size) {
  const config = AI_PROVIDERS.whisper;
  const isAllowedMime = config.allowedFormats.includes(mimetype);
  const isAllowedExt = /\.(webm|mp4|mpeg|wav|ogg|mp3|m4a)$/i.test(originalName);

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
};
