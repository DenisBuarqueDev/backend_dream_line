const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { AI_PROVIDERS } = require('../../config/aiProviders');
const cloudinaryService = require('../cloudinaryService');

const STYLE_KEYWORDS = [
  'cinematic',
  'surreal',
  'dark fantasy',
  'dreamcore',
  'spiritual atmosphere',
  'volumetric lighting',
  'emotional symbolism',
  'ultra detailed',
  'ethereal',
  'mystical',
  'otherworldly',
  'soft glow',
  'dreamlike quality',
  'symbolic imagery',
  'rich colors',
  'deep shadows',
  'luminous highlights',
];

function buildPrompt(interpretation, emotions = [], additionalContext = '') {
  const emotionDescriptors = {
    medo: 'dark shadows, tense atmosphere, dramatic contrast',
    alegria: 'warm golden light, radiant colors, uplifting glow',
    tristeza: 'soft blue tones, gentle rain, melancholic mist',
    amor: 'warm pink and rose hues, soft heart-shaped light patterns',
    ansiedade: 'fractured imagery, overlapping layers, restless patterns',
    transformacao: 'butterfly wings, cocoon of light, metamorphosis glow',
    espiritualidade: 'divine light rays, golden particles, sacred geometry',
    liberdade: 'open skies, birds in flight, expansive horizons',
    misterio: 'fog, silhouettes, hidden symbols, moonlit scenes',
    coragem: 'mountain peaks, storm clouds parting, rays of courage',
    intuicao: 'third eye glow, cosmic patterns, flowing intuition lines',
    bloqueio: 'chains of light, broken barriers, emerging from darkness',
    protecao: 'protective light shield, angelic silhouettes, safe harbor',
    sucesso: 'golden triumph light, rising sun, achievement glow',
    energia: 'pulsing energy waves, electric currents, vibrant auras',
    luz: 'radiant beams, inner light, illumination from within',
    alma: 'soul essence, ethereal self, inner cosmic reflection',
    mudanca: 'transition portals, spiral of change, transformation vortex',
    tremor: 'vibrating frequencies, rippling reality, energetic tremors',
    paz: 'calm waters, soft clouds, peaceful moonlight, serene atmosphere',
  };

  let stylePrompt = STYLE_KEYWORDS.slice(0, 6).join(', ');

  const emotionStyles = emotions
    .map(e => emotionDescriptors[e])
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

  if (emotionStyles) {
    stylePrompt += ', ' + emotionStyles;
  }

  const maxInterpretationLength = 200;
  const truncatedInterpretation = interpretation.length > maxInterpretationLength
    ? interpretation.substring(0, maxInterpretationLength) + '...'
    : interpretation;

  let finalPrompt = `Dream visualization. ${truncatedInterpretation}`;

  if (additionalContext) {
    finalPrompt += `. Context: ${additionalContext}`;
  }

  finalPrompt += `. Style: ${stylePrompt}. Aspect ratio: 16:9. No text, no watermark, no signatures.`;

  return finalPrompt;
}

async function generateDreamImage(interpretation, emotions = [], context = {}) {
  const prompt = buildPrompt(interpretation, emotions, context.additionalContext);

  const config = AI_PROVIDERS.flux.primary;
  const apiKey = process.env.FLUX_API_KEY || process.env.REPLICATE_API_KEY;

  console.log('📤 Prompt FLUX:', prompt.substring(0, 200));

  if (!apiKey) {
    console.error('❌ FLUX_API_KEY não configurada');
    return {
      imageUrl: null,
      prompt,
      seed: null,
      error: 'FLUX_API_KEY não configurada',
    };
  }

  const requestFn = async () => {
    const response = await axios({
      url: config.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`,
      },
      data: {
        version: config.version,
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: '16:9',
          output_format: 'webp',
          num_inference_steps: 4,
        },
      },
      timeout: AI_PROVIDERS.flux.timeout,
    });

    const prediction = response.data;

    if (prediction.urls && prediction.urls.get) {
      const result = await pollPrediction(prediction.urls.get, apiKey);
      return {
        imageUrl: result.output?.[0] || null,
        prompt,
        seed: result.metrics?.predict_time ? Math.floor(result.metrics.predict_time * 1000) : null,
      };
    }

    return {
      imageUrl: prediction.output?.[0] || null,
      prompt,
      seed: prediction.metrics?.predict_time ? Math.floor(prediction.metrics.predict_time * 1000) : null,
    };
  };

  try {
    console.log('🎨 FLUX: enviando requisição para Replicate...');
    const result = await executeWithRetry(requestFn, AI_PROVIDERS.flux.retries);
    console.log('✅ FLUX: imagem gerada com sucesso');

    if (result.imageUrl) {
      const cloudinaryResult = await uploadToCloudinaryFromUrl(result.imageUrl);
      if (cloudinaryResult) {
        result.imageUrl = cloudinaryResult.url;
        result.cloudinaryPublicId = cloudinaryResult.publicId;
      }
    }

    return result;
  } catch (error) {
    console.error('❌ FLUX error:', error.message);
    console.log('⚠️ fallback ativado: tentando Stability AI...');
    return await fallbackGeneration(prompt, error.message);
  }
}

async function uploadToCloudinaryFromUrl(imageUrl) {
  if (!cloudinaryService.isConfigured()) {
    console.log('☁ Cloudinary não configurado, usando URL original');
    return null;
  }

  const tempDir = path.join(__dirname, '..', '..', '..', 'temp', 'generated');
  await fs.ensureDir(tempDir);
  const tempFilePath = path.join(tempDir, `cloudinary_upload_${Date.now()}.png`);

  try {
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    await fs.writeFile(tempFilePath, Buffer.from(response.data));
    const result = await cloudinaryService.uploadDreamImage(tempFilePath);
    return result;
  } catch (error) {
    console.error('☁ Erro ao fazer upload para Cloudinary:', error.message);
    return null;
  } finally {
    try { await fs.remove(tempFilePath); } catch (_) { /* ignore */ }
  }
}

async function pollPrediction(url, apiKey, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await axios({
      url,
      method: 'GET',
      headers: { 'Authorization': `Token ${apiKey}` },
      timeout: 5000,
    });

    const status = response.data.status;
    if (status === 'succeeded') return response.data;
    if (status === 'failed') throw new Error(`FLUX prediction failed: ${response.data.error}`);

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('FLUX prediction timeout');
}

async function executeWithRetry(requestFn, retries = 2) {
  const delay = AI_PROVIDERS.flux.retryDelay;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
}

async function fallbackGeneration(prompt, errorMessage) {
  const fallback = AI_PROVIDERS.flux.fallback;
  const apiKey = fallback.apiKey || process.env.STABLE_DIFFUSION_API_KEY;

  if (apiKey) {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('prompt', prompt);
      form.append('output_format', 'png');

      const response = await axios({
        url: fallback.url,
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

      const buffer = Buffer.from(response.data);
      const base64 = buffer.toString('base64');
      const tempDir = path.join(__dirname, '..', '..', '..', 'temp', 'generated');
      await fs.ensureDir(tempDir);
      const filename = `dream_${Date.now()}.png`;
      const filepath = path.join(tempDir, filename);
      await fs.writeFile(filepath, buffer);

      console.log('✅ Stability AI online');

      let cloudinaryUrl = null;
      let cloudinaryPublicId = null;

      if (cloudinaryService.isConfigured()) {
        try {
          const cloudResult = await cloudinaryService.uploadDreamImage(filepath);
          cloudinaryUrl = cloudResult.url;
          cloudinaryPublicId = cloudResult.publicId;
        } catch (cloudError) {
          console.error('☁ Erro upload Cloudinary (fallback):', cloudError.message);
        }
      }

      return {
        imageUrl: cloudinaryUrl || `/temp/generated/${filename}`,
        imageBase64: cloudinaryUrl ? null : `data:image/png;base64,${base64}`,
        cloudinaryPublicId,
        prompt,
        seed: Date.now(),
      };
    } catch (error) {
      console.error('❌ Stability AI error:', error.response?.data || error.message);
    }
  }

  return {
    imageUrl: null,
    imageBase64: null,
    prompt,
    seed: null,
    error: `Geração de imagem falhou: ${errorMessage}`,
  };
}

module.exports = { generateDreamImage, buildPrompt };
