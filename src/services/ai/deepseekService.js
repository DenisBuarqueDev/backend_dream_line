const axios = require('axios');
const { AI_PROVIDERS } = require('../../config/aiProviders');

const devLog = process.env.NODE_ENV !== 'production' ? console.log : () => {};

const TAG_TYPES = [
  'Pessoa', 'Lugar', 'Emoção', 'Símbolo', 'Ação',
  'Tema', 'Espiritualidade', 'Animal', 'Objeto', 'Situação'
];

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

Além da interpretação, gere entre 5 e 10 tags inteligentes que representem os principais elementos do sonho.
Cada tag deve ter um name (substantivo ou frase curta em português, minúsculo, sem acentos) e um type que classifique o elemento.

Tipos válidos: ${TAG_TYPES.join(', ')}

Regras para as tags:
- Sempre em português, minúsculo, sem acentos
- Seja específico (ex: "voo" ao invés de "transporte")
- Evite tags muito genéricas como "sonho", "noite", "dormir"
- Distribua entre diferentes tipos quando possível

Formato da resposta (JSON):
{
  "interpretation": "texto da interpretação",
  "emotions": ["emoção1", "emoção2"],
  "spiritualMessage": "mensagem espiritual curta",
  "energy": "energia predominante (ex: Transformação, Cura, Expansão)",
  "symbols": [
    { "symbol": "nome do símbolo", "meaning": "significado emocional/espiritual" }
  ],
  "tags": [
    { "name": "agua", "type": "Símbolo" },
    { "name": "familia", "type": "Tema" },
    { "name": "ansiedade", "type": "Emoção" }
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

function normalizeTags(rawTags) {
  if (!Array.isArray(rawTags) || rawTags.length === 0) return [];

  const seen = new Set();
  const validTypes = new Set(TAG_TYPES);

  return rawTags
    .filter(t => t && typeof t.name === 'string' && t.name.trim())
    .map(t => ({
      name: t.name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim(),
      type: validTypes.has(t.type) ? t.type : 'Tema',
    }))
    .filter(t => {
      if (t.name.length < 2 || t.name.length > 30) return false;
      if (['sonho', 'noite', 'dormir', 'sonhar'].includes(t.name)) return false;
      const key = `${t.name}:${t.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function interpretDream(dreamText, userContext = {}) {
  const prompt = PROMPTS.interpretDream + dreamText;

  devLog('📤 DeepSeek prompt enviado:', dreamText.substring(0, 100));

  const requestFn = async () => {
    const response = await axios(buildRequest([
      { role: 'system', content: 'Você é um especialista em interpretação de sonhos com abordagem integrativa.' },
      { role: 'user', content: prompt },
    ]));

    devLog('📥 DeepSeek response recebida');

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
      tags: normalizeTags(result.tags),
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
    devLog('⚠️ Claude fallback não disponível — CLAUDE_API_KEY ausente');
    throw originalError;
  }

  devLog('⚠️ fallback ativado: tentando Claude...');

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
        devLog('✅ Claude fallback respondeu');
        return {
          interpretation: result.interpretation || '',
          emotions: result.emotions || [],
          spiritualMessage: result.spiritualMessage || '',
          energy: result.energy || 'Neutra',
          symbols: result.symbols || [],
          tags: normalizeTags(result.tags),
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

async function generateTags(dreamText, interpretation, emotions) {
  const prompt = `Com base no sonho abaixo, gere entre 5 e 10 tags inteligentes que representem os principais elementos.

SONHO: ${dreamText}
INTERPRETAÇÃO: ${interpretation}
EMOÇÕES: ${JSON.stringify(emotions)}

Responda em JSON:
{
  "tags": [
    { "name": "nome da tag", "type": "Tipo" }
  ]
}

Regras:
- Tags em português, minúsculo, sem acentos
- Entre 5 e 10 tags
- Tipos válidos: ${TAG_TYPES.join(', ')}
- Seja específico, evite tags genéricas como "sonho", "noite", "dormir"
- Distribua entre diferentes tipos`;

  const requestFn = async () => {
    const response = await axios(buildRequest([
      { role: 'system', content: 'Você é um especialista em análise de sonhos e categorização de elementos oníricos.' },
      { role: 'user', content: prompt },
    ], 0.5));

    if (response.data.choices && response.data.choices[0]) {
      const result = parseJSONResponse(response.data.choices[0].message.content);
      return normalizeTags(result?.tags);
    }
    return [];
  };

  try {
    return await executeWithRetry(requestFn);
  } catch {
    return [];
  }
}

async function sendChat(messages, temperature = 0.5) {
  const requestFn = async () => {
    const response = await axios(buildRequest(messages, temperature));
    if (response.data.choices && response.data.choices[0]) {
      const usage = response.data.usage || {};
      return {
        content: response.data.choices[0].message.content.trim(),
        promptTokens: usage.prompt_tokens != null ? usage.prompt_tokens : null,
        completionTokens: usage.completion_tokens != null ? usage.completion_tokens : null,
      };
    }
    throw new Error('DeepSeek não retornou resposta válida no chat');
  };

  try {
    return await executeWithRetry(requestFn);
  } catch (error) {
    console.error('❌ DeepSeek chat error:', error.message);
    throw error;
  }
}

async function translateToEnglish(text) {
  if (!text || text.trim().length === 0) return text;

  const requestFn = async () => {
    const response = await axios(buildRequest([
      { role: 'system', content: 'You are a translator. Translate the following text from Portuguese to English. Return ONLY the translated text, no explanations, no quotes, no prefixes.' },
      { role: 'user', content: text },
    ], 0.3));

    if (response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content.trim();
    }
    throw new Error('DeepSeek não retornou tradução');
  };

  try {
    const translated = await executeWithRetry(requestFn);
    return translated;
  } catch (error) {
    console.error('❌ Translation error:', error.message);
    return text;
  }
}

module.exports = {
  interpretDream,
  generateNumerology,
  generateSpiritualMessage,
  psychologicalAnalysis,
  translateToEnglish,
  generateTags,
  normalizeTags,
  sendChat,
};
