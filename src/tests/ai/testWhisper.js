const fs = require('fs-extra');
const path = require('path');
const { AI_PROVIDERS } = require('../../config/aiProviders');
const whisperService = require('../../services/ai/whisperService');

async function testWhisper() {
  const log = [];
  const start = Date.now();
  let status = 'offline';
  let transcription = '';
  let detectedLanguage = 'N/A';

  log.push({ time: new Date().toISOString(), type: 'info', message: 'Iniciando teste Groq Whisper...' });

  if (!process.env.GROQ_API_KEY) {
    log.push({ time: new Date().toISOString(), type: 'error', message: '❌ GROQ_API_KEY não encontrada' });
    log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Configure GROQ_API_KEY no .env' });
    return { provider: 'groq-whisper', status, elapsed: Date.now() - start, transcription, detectedLanguage, log };
  }

  const testAudioPath = path.join(__dirname, '..', '..', '..', 'tmp', 'tests', 'test_audio.webm');
  const testAudioExists = await fs.pathExists(testAudioPath);

  if (!testAudioExists) {
    log.push({ time: new Date().toISOString(), type: 'warning', message: '⚠️ Nenhum arquivo de áudio de teste encontrado em tmp/tests/' });
    log.push({ time: new Date().toISOString(), type: 'info', message: '💡 Faça upload de um áudio via POST /api/test/whisper primeiro' });
    log.push({ time: new Date().toISOString(), type: 'info', message: 'Testando apenas validação de configuração...' });

    const validation = whisperService.getGroqClient() ? true : false;
    status = validation ? 'configurado' : 'offline';

    log.push({ time: new Date().toISOString(), type: validation ? 'success' : 'error', message: validation ? '✅ Groq client configurado' : '❌ Groq client não configurado' });

    return { provider: 'groq-whisper', status, elapsed: Date.now() - start, transcription, detectedLanguage, configValid: validation, log };
  }

  try {
    log.push({ time: new Date().toISOString(), type: 'info', message: `Transcrevendo ${testAudioPath}...` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Modelo: ${AI_PROVIDERS.whisper.primary.model}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Idioma: pt` });

    const result = await whisperService.transcribeAudio(testAudioPath);

    const elapsed = Date.now() - start;

    if (result.text) {
      status = 'online';
      transcription = result.text;
      detectedLanguage = 'pt';
      log.push({ time: new Date().toISOString(), type: 'success', message: `✅ Groq Whisper transcreveu em ${elapsed}ms` });
      log.push({ time: new Date().toISOString(), type: 'info', message: `Texto: "${transcription.substring(0, 200)}"` });
      log.push({ time: new Date().toISOString(), type: 'info', message: `Provider: ${result.provider || 'groq-whisper'}` });
    } else {
      status = 'offline';
      log.push({ time: new Date().toISOString(), type: 'error', message: `❌ Groq Whisper retornou texto vazio` });
      if (result.error) {
        log.push({ time: new Date().toISOString(), type: 'debug', message: `Erro: ${result.error}` });
      }
    }

    return { provider: 'groq-whisper', status, elapsed, transcription: transcription.substring(0, 200), detectedLanguage, log };

  } catch (error) {
    const elapsed = Date.now() - start;
    status = 'offline';

    log.push({ time: new Date().toISOString(), type: 'error', message: `❌ Groq Whisper falhou: ${error.message}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Tempo: ${elapsed}ms` });

    if (error.status === 401 || error.status === 403) {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Erro de autenticação — verifique GROQ_API_KEY' });
    } else if (error.status === 429) {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Limite de requisições (rate limit)' });
    } else if (error.status === 413) {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Arquivo muito grande. Máximo 25MB.' });
    }

    return { provider: 'groq-whisper', status, elapsed, transcription, detectedLanguage, error: error.message, log };
  }
}

module.exports = { testWhisper };
