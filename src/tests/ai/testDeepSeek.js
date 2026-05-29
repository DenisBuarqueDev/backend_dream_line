const axios = require('axios');
const { AI_PROVIDERS } = require('../../config/aiProviders');

const TEST_PROMPT = `Interprete brevemente este sonho em português brasileiro:
Sonhei que estava voando sobre uma cidade iluminada.`;

async function testDeepSeek() {
  const log = [];
  const start = Date.now();
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY;
  let status = 'offline';
  let modelUsed = 'N/A';
  let tokensUsed = 0;
  let responsePreview = '';

  log.push({ time: new Date().toISOString(), type: 'info', message: 'Iniciando teste DeepSeek...' });

  if (!apiKey) {
    log.push({ time: new Date().toISOString(), type: 'error', message: '❌ DEEPSEEK_API_KEY não encontrada no .env' });
    log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Defina DEEPSEEK_API_KEY ou USE_AI_GATEWAY=false para usar o sistema legado' });
    return { provider: 'deepseek', status, elapsed: Date.now() - start, modelUsed, tokensUsed, responsePreview, log };
  }

  const config = AI_PROVIDERS.deepseek.primary;

  try {
    log.push({ time: new Date().toISOString(), type: 'info', message: `Enviando requisição para ${config.url}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Payload: model=${config.model}, max_tokens=${config.maxTokens}` });

    const response = await axios({
      url: config.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      data: {
        model: config.model,
        messages: [
          { role: 'system', content: 'Você é um especialista em interpretação de sonhos.' },
          { role: 'user', content: TEST_PROMPT },
        ],
        temperature: 0.7,
        max_tokens: 300,
      },
      timeout: AI_PROVIDERS.deepseek.timeout,
    });

    const elapsed = Date.now() - start;
    status = 'online';
    modelUsed = config.model;

    if (response.data.choices && response.data.choices[0]) {
      tokensUsed = response.data.usage?.total_tokens || 0;
      responsePreview = response.data.choices[0].message.content.substring(0, 150);
    }

    log.push({ time: new Date().toISOString(), type: 'success', message: `✅ DeepSeek respondeu em ${elapsed}ms` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Modelo: ${modelUsed}` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Tokens: ${tokensUsed}` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Status HTTP: ${response.status}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Resposta: ${responsePreview}...` });

    return { provider: 'deepseek', status, elapsed, modelUsed, tokensUsed, responsePreview, httpStatus: response.status, log };
  } catch (error) {
    const elapsed = Date.now() - start;
    status = 'offline';
    const httpStatus = error.response?.status || 'N/A';
    const errorMessage = error.response?.data?.error?.message || error.message;

    log.push({ time: new Date().toISOString(), type: 'error', message: `❌ DeepSeek falhou: ${errorMessage}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `HTTP Status: ${httpStatus}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Tempo: ${elapsed}ms` });

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Provider offline — verifique sua conexão' });
    } else if (httpStatus === 401 || httpStatus === 403) {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Erro de autenticação — verifique DEEPSEEK_API_KEY' });
    } else if (httpStatus === 429) {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Limite de requisições atingido (rate limit)' });
    } else if (httpStatus === 413) {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Payload muito grande' });
    }

    return { provider: 'deepseek', status, elapsed, modelUsed, tokensUsed, responsePreview, httpStatus, error: errorMessage, log };
  }
}

module.exports = { testDeepSeek };
