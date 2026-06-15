const axios = require('axios');
const { AI_PROVIDERS } = require('../config/aiProviders');

const devLog = process.env.NODE_ENV !== 'production' ? console.log : () => {};

const ANALYSIS_PROMPT = `Você é um especialista em análise emocional com abordagem acolhedora e profunda. Analise o sentimento abaixo e forneça uma análise completa em português brasileiro.

REGRAS:
- Identifique a emoção principal com precisão
- Avalie a intensidade de 1 a 10
- Liste possíveis causas emocionais
- Dê sugestões práticas e acolhedoras
- Gere um resumo emocional curto e significativo
- Use linguagem acolhedora e empática
- Seja específico, não use respostas genéricas

Formato da resposta (JSON):
{
  "emotion": "emoção principal",
  "intensity": número de 1 a 10,
  "causes": ["causa 1", "causa 2", "causa 3"],
  "advice": ["sugestão 1", "sugestão 2", "sugestão 3"],
  "aiSummary": "resumo emocional curto e significativo"
}

SENTIMENTO DO USUÁRIO:
`;

const CHAT_PROMPT = `Você é um acompanhante emocional acolhedor e empático. O usuário compartilhou um sentimento e você está conversando com ele sobre isso.

Abaixo está o registro emocional atual do usuário e seu histórico recente de emoções.

REGISTRO ATUAL:
{currentRecord}

HISTÓRICO RECENTE:
{recentHistory}

INSTRUÇÕES:
- Responda de forma acolhedora e empática em português brasileiro
- Conecte o sentimento atual com padrões do histórico quando relevante
- Faça perguntas reflexivas para ajudar o usuário a se autoconhecer
- Ofereça perspectivas e sugestões suaves
- Mantenha as respostas concisas (máximo 200 palavras)
- Não seja genérico, seja específico baseado no que o usuário compartilhou

Conversa atual:
`;

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

async function analyzeEmotion(text) {
  const prompt = ANALYSIS_PROMPT + text;

  devLog('📤 Enviando texto para análise emocional');

  const requestFn = async () => {
    const response = await axios(buildRequest([
      { role: 'system', content: 'Você é um especialista em análise emocional com abordagem integrativa.' },
      { role: 'user', content: prompt },
    ]));

    devLog('📥 Resposta da análise emocional recebida');

    let result;
    if (response.data.choices && response.data.choices[0]) {
      result = parseJSONResponse(response.data.choices[0].message.content);
    }

    if (!result) {
      throw new Error('IA não retornou JSON válido na análise emocional');
    }

    return {
      emotion: result.emotion || 'Neutro',
      intensity: Math.min(10, Math.max(1, result.intensity || 5)),
      causes: result.causes || [],
      advice: result.advice || [],
      aiSummary: result.aiSummary || '',
    };
  };

  try {
    return await executeWithRetry(requestFn);
  } catch (error) {
    console.error('❌ Erro na análise emocional:', error.message);
    return {
      emotion: 'Não foi possível identificar',
      intensity: 5,
      causes: ['Não foi possível analisar as causas automaticamente.'],
      advice: ['Tente descrever seus sentimentos com mais detalhes.'],
      aiSummary: 'Não foi possível gerar um resumo automático.',
    };
  }
}

async function chatWithAI(emotionRecord, recentHistory, messages) {
  const recentHistoryStr = recentHistory.length > 0
    ? recentHistory.slice(0, 5).map((r, i) =>
        `${i + 1}. Emoção: ${r.emotion} (Intensidade: ${r.intensity}/10) - ${r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : ''}`
      ).join('\n')
    : 'Nenhum registro anterior.';

  const currentRecordStr = `Emoção: ${emotionRecord.emotion}\nIntensidade: ${emotionRecord.intensity}/10\nResumo: ${emotionRecord.aiSummary}`;

  let prompt = CHAT_PROMPT
    .replace('{currentRecord}', currentRecordStr)
    .replace('{recentHistory}', recentHistoryStr);

  const chatMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const requestFn = async () => {
    const response = await axios(buildRequest([
      { role: 'system', content: prompt },
      ...chatMessages,
      { role: 'user', content: chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].content : 'Olá' },
    ], 0.8));

    devLog('📥 Resposta do chat emocional recebida');

    if (response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content.trim();
    }
    throw new Error('IA não retornou resposta no chat emocional');
  };

  try {
    return await executeWithRetry(requestFn);
  } catch (error) {
    console.error('❌ Erro no chat emocional:', error.message);
    return 'Desculpe, não consegui processar sua mensagem agora. Pode tentar novamente?';
  }
}

module.exports = {
  analyzeEmotion,
  chatWithAI,
};
