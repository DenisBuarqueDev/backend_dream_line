const axios = require('axios');
const { AI_PROVIDERS } = require('../../config/aiProviders');

const TEST_PROMPT = 'Explique o significado emocional de sonhar com água. Seja breve, máximo 100 palavras.';

async function testClaude() {
  const log = [];
  const start = Date.now();
  const apiKey = process.env.CLAUDE_API_KEY;
  let status = 'offline';
  let responsePreview = '';
  let tokensUsed = 0;

  log.push({ time: new Date().toISOString(), type: 'info', message: 'Iniciando teste Claude (Anthropic)...' });

  if (!apiKey) {
    log.push({ time: new Date().toISOString(), type: 'error', message: '❌ CLAUDE_API_KEY não encontrada no .env' });
    log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Configure CLAUDE_API_KEY no .env para usar fallback' });
    return { provider: 'claude', status, elapsed: Date.now() - start, responsePreview, tokensUsed, log };
  }

  try {
    log.push({ time: new Date().toISOString(), type: 'info', message: `Enviando requisição para ${AI_PROVIDERS.deepseek.fallback.url}` });

    const response = await axios({
      url: AI_PROVIDERS.deepseek.fallback.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      data: {
        model: AI_PROVIDERS.deepseek.fallback.model,
        max_tokens: 300,
        messages: [
          { role: 'user', content: TEST_PROMPT },
        ],
      },
      timeout: 30000,
    });

    const elapsed = Date.now() - start;
    status = 'online';

    if (response.data.content && response.data.content[0]) {
      responsePreview = response.data.content[0].text.substring(0, 150);
      tokensUsed = response.data.usage?.output_tokens || 0;
    }

    log.push({ time: new Date().toISOString(), type: 'success', message: `✅ Claude respondeu em ${elapsed}ms` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Modelo: ${AI_PROVIDERS.deepseek.fallback.model}` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Tokens: ${tokensUsed}` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Status HTTP: ${response.status}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Resposta: ${responsePreview}...` });

    return { provider: 'claude', status, elapsed, modelUsed: AI_PROVIDERS.deepseek.fallback.model, tokensUsed, responsePreview, httpStatus: response.status, log };

  } catch (error) {
    const elapsed = Date.now() - start;
    status = 'offline';
    const httpStatus = error.response?.status || 'N/A';
    const errorMessage = error.response?.data?.error?.message || error.message;

    log.push({ time: new Date().toISOString(), type: 'error', message: `❌ Claude falhou: ${errorMessage}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `HTTP Status: ${httpStatus}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Tempo: ${elapsed}ms` });

    if (httpStatus === 401 || httpStatus === 403) {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Erro de autenticação — verifique CLAUDE_API_KEY' });
    } else if (httpStatus === 429) {
      log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Limite de requisições (rate limit)' });
    }

    return { provider: 'claude', status, elapsed, responsePreview, tokensUsed, httpStatus, error: errorMessage, log };
  }
}

module.exports = { testClaude };
