const deepseekService = require('./deepseekService');
const fluxService = require('./fluxService');
const whisperService = require('./whisperService');
const { FEATURE_ROUTING } = require('../../config/aiProviders');

const USE_NEW_ARCHITECTURE = process.env.USE_AI_GATEWAY === 'true' || false;

async function processDreamPipeline(dreamText, userContext = {}, options = {}) {
  if (!USE_NEW_ARCHITECTURE) {
    const { analisarSonho } = require('../aiService');
    const mockResult = await analisarSonho(dreamText);
    return {
      interpretation: mockResult.interpretacao || '',
      categorias: mockResult.categorias || [],
      padroes: mockResult.padroes || { tematicos: [], espirituais: [], biologicos: [] },
      emotions: [],
      numerology: null,
      spiritualMessage: '',
      energy: '',
      symbols: [],
      image: null,
      psychologicalAnalysis: '',
      provider: 'legacy-mock',
    };
  }

  const result = {
    interpretation: '',
    categorias: [],
    padroes: { tematicos: [], espirituais: [], biologicos: [] },
    emotions: [],
    numerology: null,
    spiritualMessage: '',
    energy: '',
    symbols: [],
    image: null,
    psychologicalAnalysis: '',
    provider: 'deepseek',
  };

  try {
    const deepseekResult = await deepseekService.interpretDream(dreamText, userContext);
    Object.assign(result, {
      interpretation: deepseekResult.interpretation || '',
      emotions: deepseekResult.emotions || [],
      spiritualMessage: deepseekResult.spiritualMessage || '',
      energy: deepseekResult.energy || '',
      symbols: deepseekResult.symbols || [],
      numerology: deepseekResult.numerology || null,
    });
  } catch (error) {
    console.error('[AIGateway] DeepSeek error:', error.message);
    const { analisarSonho } = require('../aiService');
    const mockResult = await analisarSonho(dreamText);
    result.interpretation = mockResult.interpretacao || '';
    result.categorias = mockResult.categorias || [];
    result.padroes = mockResult.padroes || { tematicos: [], espirituais: [], biologicos: [] };
    result.provider = 'fallback-mock';
  }

  if (options.generateImage !== false && result.interpretation) {
    try {
      const imageResult = await fluxService.generateDreamImage(
        result.interpretation,
        result.emotions,
        { dreamText }
      );
      result.image = imageResult;
    } catch (error) {
      console.error('[AIGateway] FLUX error:', error.message);
      result.image = { error: error.message };
    }
  }

  if (result.interpretation && options.psychologicalAnalysis) {
    try {
      result.psychologicalAnalysis = await deepseekService.psychologicalAnalysis(
        dreamText,
        result.interpretation
      );
    } catch {
      // não crítico
    }
  }

  return result;
}

async function transcribeAndInterpret(audioFilePath, userContext = {}, options = {}) {
  let transcription = '';

  try {
    const whisperResult = await whisperService.transcribeAudio(audioFilePath);
    transcription = whisperResult.text || '';
  } catch (error) {
    console.error('[AIGateway] Whisper error:', error.message);
    return { error: 'Falha na transcrição de áudio' };
  }

  if (!transcription) {
    return { error: 'Transcrição vazia' };
  }

  const interpretation = await processDreamPipeline(transcription, userContext, options);

  return {
    transcription,
    ...interpretation,
  };
}

async function generateDreamImage(interpretation, emotions = [], context = {}) {
  if (USE_NEW_ARCHITECTURE) {
    return fluxService.generateDreamImage(interpretation, emotions, context);
  }
  return { imageUrl: null, prompt: '', error: 'AI Gateway desabilitado' };
}

function getRoutingInfo() {
  return {
    active: USE_NEW_ARCHITECTURE,
    routing: FEATURE_ROUTING,
    features: {
      dreamInterpretation: USE_NEW_ARCHITECTURE ? 'deepseek' : 'legacy-mock',
      imageGeneration: USE_NEW_ARCHITECTURE ? 'flux' : 'disabled',
      audioTranscription: 'whisper',
    },
  };
}

module.exports = {
  processDreamPipeline,
  transcribeAndInterpret,
  generateDreamImage,
  getRoutingInfo,
  USE_NEW_ARCHITECTURE,
};
