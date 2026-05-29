const axios = require('axios');
const { AI_PROVIDERS } = require('../../config/aiProviders');

const PROMPTS = {
  interpretDream: `Você é um especialista em interpretação de sonhos com abordagem emocional, espiritual e psicológica. Analise o sonho abaixo e forneça uma interpretação profunda e humanizada em português brasileiro.

REGRAS:
- Máximo 300 palavras
- Linguagem acolhedora e profunda
- Conecte símbolos com emoções
- Identifique padrões emocionais
- Use tom espiritual mas fundamentado
- NÃO use linguagem genérica
- Seja específico sobre os símbolos mencionados

Formato da resposta (JSON):
{
  "interpretation": "texto da interpretação",
  "emotions": ["emoção1", "emoção2"],
  "spiritualMessage": "mensagem espiritual curta",
  "energy": "energia predominante (ex: Transformação, Cura, Expansão)",
  "symbols": [
    { "symbol": "nome do símbolo", "meaning": "significado emocional/espiritual" }
  ]
}

SONHO DO USUÁRIO:
`,
  emotionalNumerology: `Com base nas emoções detectadas no sonho, calcule a numerologia emocional.

Emoções detectadas: {emotions}
Signo Solar: {sunSign}
Signo Lunar: {moonSign}
Ascendente: {ascendant}

Responda em JSON:
{
  "vibration": número,
  "energy": número,
  "luckyNumbers": {
    "megaSena": [6 números],
    "quina": [5 números],
    "lotofacil": [15 números]
  },
  "chakra": "nome do chakra",
  "planet": "planeta regente",
  "frequency": "frequência em Hz"
}`,
  spiritualMessage: `Você é um guia espiritual. Gere uma mensagem espiritual curta e poderosa baseada nas emoções e energia do sonho abaixo. Máximo 100 palavras. Seja sutil, não religioso, use linguagem universal.

Interpretação: {interpretation}
Emoções: {emotions}
Energia: {energy}`,
  psychologicalAnalysis: `Faça uma análise psicológica breve do sonho abaixo, identificando padrões inconscientes, conflitos internos e oportunidades de crescimento pessoal. Máximo 150 palavras. Use abordagem junguiana suave.

SONHO: {dreamText}
INTERPRETAÇÃO: {interpretation}`,
};

function buildRequest(messages, temperature = 0.7) {
  const config = AI_PROVIDERS.deepseek.primary;
  return {
    url: config.url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY}`,
    },
    data: {
      model: config.model,
      messages,
      temperature,
      max_tokens: config.maxTokens,
    },
    timeout: AI_PROVIDERS.deepseek.timeout,
  };
}

async function executeWithRetry(requestFn, retries = AI_PROVIDERS.deepseek.retries) {
  const delay = AI_PROVIDERS.deepseek.retryDelay;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt === retries) throw error;
      const wait = delay * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
}

function parseJSONResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function interpretDream(dreamText, userContext = {}) {
  const prompt = PROMPTS.interpretDream + dreamText;

  console.log('📤 DeepSeek prompt enviado:', dreamText.substring(0, 100));

  const requestFn = async () => {
    const response = await axios(buildRequest([
      { role: 'system', content: 'Você é um especialista em interpretação de sonhos com abordagem integrativa.' },
      { role: 'user', content: prompt },
    ]));

    console.log('📥 DeepSeek response recebida');

    let result;
    if (response.data.choices && response.data.choices[0]) {
      result = parseJSONResponse(response.data.choices[0].message.content);
    }

    if (!result) {
      throw new Error('DeepSeek não retornou JSON válido na interpretação');
    }

    return {
      interpretation: result.interpretation || '',
      emotions: result.emotions || [],
      spiritualMessage: result.spiritualMessage || '',
      energy: result.energy || 'Neutra',
      symbols: result.symbols || [],
      numerology: await generateNumerology(
        result.emotions || [],
        userContext.sunSign,
        userContext.moonSign,
        userContext.ascendant
      ),
    };
  };

  try {
    return await executeWithRetry(requestFn);
  } catch (error) {
    console.error('❌ DeepSeek error:', error.message);
    return forwardToClaude(dreamText, userContext, error);
  }
}

async function forwardToClaude(dreamText, userContext, originalError) {
  const { AI_PROVIDERS: config } = require('../../config/aiProviders');
  const fallback = config.deepseek.fallback;

  if (!fallback.apiKey) {
    console.log('⚠️ Claude fallback não disponível — CLAUDE_API_KEY ausente');
    throw originalError;
  }

  console.log('⚠️ fallback ativado: tentando Claude...');

  try {
    const response = await axios({
      url: fallback.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': fallback.apiKey,
        'anthropic-version': '2023-06-01',
      },
      data: {
        model: fallback.model,
        max_tokens: 1000,
        messages: [
          { role: 'user', content: PROMPTS.interpretDream + dreamText },
        ],
      },
      timeout: 30000,
    });

    if (response.data.content && response.data.content[0]) {
      const result = parseJSONResponse(response.data.content[0].text);
      if (result) {
        console.log('✅ Claude fallback respondeu');
        return {
          interpretation: result.interpretation || '',
          emotions: result.emotions || [],
          spiritualMessage: result.spiritualMessage || '',
          energy: result.energy || 'Neutra',
          symbols: result.symbols || [],
          numerology: null,
        };
      }
    }

    throw new Error('Claude não retornou JSON válido');
  } catch (claudeError) {
    console.error('❌ Claude fallback error:', claudeError.message);
    throw originalError;
  }
}

async function generateNumerology(emotions, sunSign, moonSign, ascendant) {
  const prompt = PROMPTS.emotionalNumerology
    .replace('{emotions}', JSON.stringify(emotions))
    .replace('{sunSign}', sunSign || 'desconhecido')
    .replace('{moonSign}', moonSign || 'desconhecido')
    .replace('{ascendant}', ascendant || 'desconhecido');

  const requestFn = async () => {
    const response = await axios(buildRequest([
      { role: 'system', content: 'Você é um numerólogo especializado em numerologia emocional.' },
      { role: 'user', content: prompt },
    ]));

    if (response.data.choices && response.data.choices[0]) {
      return parseJSONResponse(response.data.choices[0].message.content);
    }
    return null;
  };

  try {
    return await executeWithRetry(requestFn);
  } catch {
    return null;
  }
}

async function generateSpiritualMessage(interpretation, emotions, energy) {
  const prompt = PROMPTS.spiritualMessage
    .replace('{interpretation}', interpretation)
    .replace('{emotions}', JSON.stringify(emotions))
    .replace('{energy}', energy);

  const requestFn = async () => {
    const response = await axios(buildRequest([
      { role: 'system', content: 'Você é um guia espiritual sábio e acolhedor.' },
      { role: 'user', content: prompt },
    ], 0.8));

    if (response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content.trim();
    }
    return '';
  };

  try {
    return await executeWithRetry(requestFn);
  } catch {
    return '';
  }
}

async function psychologicalAnalysis(dreamText, interpretation) {
  const prompt = PROMPTS.psychologicalAnalysis
    .replace('{dreamText}', dreamText)
    .replace('{interpretation}', interpretation);

  const requestFn = async () => {
    const response = await axios(buildRequest([
      { role: 'system', content: 'Você é um psicólogo analítico com abordagem junguiana.' },
      { role: 'user', content: prompt },
    ], 0.6));

    if (response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content.trim();
    }
    return '';
  };

  try {
    return await executeWithRetry(requestFn);
  } catch {
    return '';
  }
}

module.exports = {
  interpretDream,
  generateNumerology,
  generateSpiritualMessage,
  psychologicalAnalysis,
};
