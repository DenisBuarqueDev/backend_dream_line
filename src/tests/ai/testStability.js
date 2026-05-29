const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');
const { AI_PROVIDERS } = require('../../config/aiProviders');

const TEST_PROMPT = 'mystical dream landscape, ethereal, spiritual, soft glowing light';

async function testStability() {
  const log = [];
  const start = Date.now();
  const apiKey = process.env.STABLE_DIFFUSION_API_KEY;
  let status = 'offline';

  log.push({ time: new Date().toISOString(), type: 'info', message: 'Iniciando teste Stability AI (v2beta)...' });

  if (!apiKey) {
    log.push({ time: new Date().toISOString(), type: 'error', message: '❌ STABLE_DIFFUSION_API_KEY não encontrada' });
    log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Configure STABLE_DIFFUSION_API_KEY no .env' });
    return { provider: 'stability', status, elapsed: Date.now() - start, log };
  }

  const url = AI_PROVIDERS.flux.fallback.url;

  try {
    log.push({ time: new Date().toISOString(), type: 'info', message: `Enviando prompt para ${url}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Prompt: "${TEST_PROMPT}"` });
    log.push({ time: new Date().toISOString(), type: 'info', message: 'Usando multipart/form-data + arraybuffer (v2beta)' });

    const form = new FormData();
    form.append('prompt', TEST_PROMPT);
    form.append('output_format', 'png');

    const response = await axios({
      url,
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'image/*',
      },
      data: form,
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    const elapsed = Date.now() - start;
    status = 'online';

    const buffer = Buffer.from(response.data);
    const base64 = buffer.toString('base64');

    const tempDir = path.join(__dirname, '..', '..', '..', 'tmp', 'tests');
    await fs.ensureDir(tempDir);
    const filepath = path.join(tempDir, `stability_test_${Date.now()}.png`);
    await fs.writeFile(filepath, buffer);

    console.log('Stability AI online');
    log.push({ time: new Date().toISOString(), type: 'success', message: `✅ Imagem gerada com sucesso` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Tamanho: ${buffer.length} bytes` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Arquivo: ${filepath}` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Status HTTP: ${response.status}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Content-Type: ${response.headers['content-type']}` });

    return {
      provider: 'stability',
      status,
      elapsed,
      base64: `${base64.substring(0, 80)}...`,
      filepath,
      size: buffer.length,
      httpStatus: response.status,
      log,
    };
  } catch (error) {
    const elapsed = Date.now() - start;
    status = 'offline';
    const httpStatus = error.response?.status || 'N/A';
    const errorData = error.response?.data || error.message;
    const errorMessage = Buffer.isBuffer(errorData) ? errorData.toString('utf8') : (typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);

    console.error('Stability AI error:', errorMessage);
    log.push({ time: new Date().toISOString(), type: 'error', message: `❌ Stability AI falhou: ${errorMessage.substring(0, 200)}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `HTTP Status: ${httpStatus}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Tempo: ${elapsed}ms` });

    if (httpStatus === 401 || httpStatus === 403) {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Erro de autenticação — verifique STABLE_DIFFUSION_API_KEY' });
    } else if (httpStatus === 429) {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Quota exceeded — limite de gerações atingido' });
    } else if (httpStatus === 400) {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Payload inválido — verifique os parâmetros enviados' });
    }

    return { provider: 'stability', status, elapsed, httpStatus, error: errorMessage.substring(0, 300), log };
  }
}

module.exports = { testStability };
