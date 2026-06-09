const deepseekService = require('./deepseekService');
const fluxService = require('./fluxService');
const whisperService = require('./whisperService');
const { FEATURE_ROUTING } = require('../../config/aiProviders');

const devLog = process.env.NODE_ENV !== 'production' ? console.log : () => {};

const USE_NEW_ARCHITECTURE = true;

async function processDreamPipeline(dreamText, userContext = {}, options = {}) {
  devLog('📤 Dream sent to DeepSeek:', dreamText.substring(0, 100));

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
    devLog('✅ DeepSeek response recebida');

    Object.assign(result, {
      interpretation: deepseekResult.interpretation || '',
      emotions: deepseekResult.emotions || [],
      spiritualMessage: deepseekResult.spiritualMessage || '',
      energy: deepseekResult.energy || '',
      symbols: deepseekResult.symbols || [],
      numerology: deepseekResult.numerology || null,
    });
  } catch (error) {
    console.error('❌ DeepSeek error:', error.message);
    throw new Error(`Falha na interpretação: ${error.message}`);
  }

  if (options.generateImage !== false && result.interpretation) {
    try {
      devLog('🎨 Generating image with FLUX');
      const imageResult = await fluxService.generateDreamImage(
        result.interpretation,
        result.emotions,
        { dreamText }
      );
      result.image = imageResult;
      devLog('✅ FLUX image generated');
    } catch (error) {
      console.error('❌ FLUX error:', error.message);
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
  devLog('🎨 Generating image with FLUX');
  devLog('📤 Prompt:', interpretation.substring(0, 200));
  const result = await fluxService.generateDreamImage(interpretation, emotions, context);
  devLog('✅ FLUX response:', result.imageUrl ? 'imagem gerada' : 'falha');
  return result;
}

function getRoutingInfo() {
  return {
    active: USE_NEW_ARCHITECTURE,
    routing: FEATURE_ROUTING,
    features: {
      dreamInterpretation: 'deepseek',
      imageGeneration: 'flux',
      audioTranscription: 'groq-whisper',
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
