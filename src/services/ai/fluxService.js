const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const { AI_PROVIDERS } = require('../../config/aiProviders');
const cloudinaryService = require('../cloudinaryService');
const deepseekService = require('./deepseekService');

const devLog = process.env.NODE_ENV !== 'production' ? console.log : () => {};
const devWarn = process.env.NODE_ENV !== 'production' ? console.warn : () => {};

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const BLOCKED_CONTENT_TYPES = ['text/html', 'application/json', 'text/plain'];

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
  const promptPt = interpretation;
  const contextPt = context.additionalContext || '';
  devLog('📝 Prompt PT:', promptPt.substring(0, 200));

  const promptEn = await deepseekService.translateToEnglish(promptPt);
  const contextEn = contextPt
    ? await deepseekService.translateToEnglish(contextPt)
    : '';
  devLog('📝 Prompt EN:', promptEn.substring(0, 200));

  const prompt = buildPrompt(promptEn, emotions, contextEn);

  const config = AI_PROVIDERS.flux.primary;
  const apiKey = process.env.FLUX_API_KEY || process.env.REPLICATE_API_KEY;

  devLog('📤 Prompt FLUX:', prompt.substring(0, 200));

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
    devLog('🎨 Provider: Replicate (FLUX)');
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
      validateStatus: (status) => status < 500,
    });

    devLog('🎨 Status Replicate:', response.status);

    if (response.status === 429) {
      throw Object.assign(new Error('Limite de uso ou créditos insuficientes na Replicate API'), {
        status: 429, provider: 'replicate', response: response.data,
      });
    }

    if (response.status !== 200 && response.status !== 201) {
      throw Object.assign(new Error(`Replicate retornou status ${response.status}: ${JSON.stringify(response.data).substring(0, 200)}`), {
        status: response.status, provider: 'replicate', response: response.data,
      });
    }

    const prediction = response.data;
    devLog('📥 Resposta FLUX (primeiro 400 chars):', JSON.stringify(prediction).substring(0, 400));

    if (prediction.urls && prediction.urls.get) {
      devLog('🔗 URL de polling Replicate:', prediction.urls.get);
      const result = await pollPrediction(prediction.urls.get, apiKey);
      const imageUrl = result.output?.[0] || null;
      devLog('🔗 URL da imagem gerada (output[0]):', imageUrl);
      return {
        imageUrl,
        prompt,
        seed: result.metrics?.predict_time ? Math.floor(result.metrics.predict_time * 1000) : null,
      };
    }

    const imageUrl = prediction.output?.[0] || null;
    devLog('🔗 URL da imagem (resposta direta):', imageUrl);
    return {
      imageUrl,
      prompt,
      seed: prediction.metrics?.predict_time ? Math.floor(prediction.metrics.predict_time * 1000) : null,
    };
  };

  try {
    devLog('🎨 FLUX: enviando requisição para Replicate...');
    const result = await executeWithRetry(requestFn, AI_PROVIDERS.flux.retries);
    devLog('✅ FLUX: imagem gerada com sucesso');

    if (result.imageUrl) {
      const cloudinaryResult = await uploadToCloudinaryFromUrl(result.imageUrl);
      if (cloudinaryResult) {
        result.imageUrl = cloudinaryResult.url;
        result.cloudinaryPublicId = cloudinaryResult.publicId;
      }
    }

    return result;
  } catch (error) {
    const fluxStatus = error.status || error.response?.status || 500;
    console.error('❌ Image Generation Error');
    console.error('❌ Provider: Replicate (FLUX)');
    console.error('❌ Status:', fluxStatus);
    console.error('❌ Data:', error.response?.data || error.message);

    if (fluxStatus === 429) {
      devLog('⚠️ FLUX rate limitado, tentando fallback...');
      const fallbackResult = await fallbackGeneration(prompt, error.message);
      if (fallbackResult.imageUrl) return fallbackResult;
      fallbackResult.provider = 'replicate';
      fallbackResult.status = 429;
      fallbackResult.message = 'Limite de uso ou créditos insuficientes';
      return fallbackResult;
    }

    devLog('⚠️ fallback ativado: tentando Stability AI...');
    return await fallbackGeneration(prompt, error.message);
  }
}

async function uploadToCloudinaryFromUrl(imageUrl) {
  if (!cloudinaryService.isConfigured()) {
    devLog('☁ Cloudinary não configurado, usando URL original');
    return null;
  }

  devLog('☁ Iniciando download da imagem:', imageUrl);

  const tempDir = path.join(__dirname, '..', '..', '..', 'temp', 'generated');
  await fs.ensureDir(tempDir);
  const tempFilePath = path.join(tempDir, `cloudinary_upload_${Date.now()}.png`);

  try {
    devLog('☁ Provider: Cloudinary (upload)');
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 30000,
      validateStatus: (status) => status < 500,
    });

    devLog('☁ Status download image:', response.status);

    if (response.status === 429) {
      throw Object.assign(new Error('Rate limit no download da imagem'), { status: 429, provider: 'cloudinary' });
    }

    const contentType = response.headers['content-type'] || '';
    devLog('☁ Content-Type recebido:', contentType);

    const isBlocked = BLOCKED_CONTENT_TYPES.some(t => contentType.includes(t));
    if (isBlocked) {
      const preview = Buffer.from(response.data).slice(0, 200).toString('utf-8');
      console.error('☁ CONTEÚDO INVÁLIDO! Content-Type bloqueado:', contentType);
      console.error('☁ Preview do conteúdo:', preview);
      throw new Error(`Conteúdo não é uma imagem. Content-Type: ${contentType}`);
    }

    const isAllowed = ALLOWED_IMAGE_TYPES.some(t => contentType.includes(t));
    if (!isAllowed) {
      devWarn('☁ Content-Type não reconhecido como imagem:', contentType, '- tentando upload mesmo assim');
    }

    await fs.writeFile(tempFilePath, Buffer.from(response.data));

    const fileBuffer = await fs.readFile(tempFilePath);
    const headerHex = fileBuffer.slice(0, 8).toString('hex');
    const isPng = headerHex.startsWith('89504e47');
    const isJpeg = headerHex.startsWith('ffd8');
    const isWebp = headerHex.startsWith('52494646');

    if (!isPng && !isJpeg && !isWebp) {
      const textPreview = fileBuffer.slice(0, 300).toString('utf-8');
      console.error('☁ ARQUIVO NÃO É IMAGEM VÁLIDA! Magic bytes:', headerHex);
      console.error('☁ Preview do conteúdo:', textPreview);
      throw new Error('Arquivo baixado não é uma imagem válida (magic bytes não correspondem)');
    }

    devLog('☁ Imagem validada com sucesso (magic bytes):', headerHex);

    const result = await cloudinaryService.uploadDreamImage(tempFilePath);
    devLog('☁ URL Cloudinary final:', result.url);
    devLog('☁ Public ID Cloudinary:', result.publicId);
    return result;
  } catch (error) {
    const cloudStatus = error.status || error.response?.status || 500;
    console.error('☁ Image Generation Error');
    console.error('☁ Provider: Cloudinary (upload)');
    console.error('☁ Status:', cloudStatus);
    console.error('☁ Data:', error.response?.data || error.message);
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
      validateStatus: (status) => status < 500,
    });

    if (response.status === 429) {
      throw Object.assign(new Error('Limite de uso ou créditos insuficientes na Replicate API (polling)'), {
        status: 429, provider: 'replicate',
      });
    }

    const predStatus = response.data.status;
    devLog(`⏳ Polling Replicate tentativa ${i + 1}/${maxAttempts}: status=${predStatus}, http=${response.status}`);
    if (predStatus === 'succeeded') return response.data;
    if (predStatus === 'failed') throw new Error(`FLUX prediction failed: ${response.data.error}`);

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
      devWarn(`⚠️ Tentativa ${attempt}/${retries} falhou:`, error.message, '| status:', error.status || error.response?.status);
      if (error.status === 429) throw error;
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

      devLog('🎨 Provider: Stability AI');
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
        validateStatus: (status) => status < 500,
      });

      devLog('🎨 Status Stability:', response.status);

      const contentType = response.headers['content-type'] || '';
      const isJsonResponse = contentType.includes('application/json');

      if (isJsonResponse) {
        const errorBody = Buffer.from(response.data).toString('utf-8');
        let errorData;
        try {
          errorData = JSON.parse(errorBody);
        } catch {
          errorData = { errors: [errorBody] };
        }
        const errorMsg = errorData?.errors?.[0] || errorData?.message || 'Erro desconhecido na Stability AI';
        console.error('❌ Stability AI retornou erro:', errorMsg);
        return {
          imageUrl: null,
          error: errorMsg,
          status: response.status,
          provider: 'stability',
        };
      }

      if (response.status !== 200) {
        console.error('❌ Stability AI retornou status:', response.status);
        return {
          imageUrl: null,
          error: `Stability AI retornou status ${response.status}`,
          status: response.status,
          provider: 'stability',
        };
      }

      const buffer = Buffer.from(response.data);
      const base64 = buffer.toString('base64');
      const tempDir = path.join(__dirname, '..', '..', '..', 'temp', 'generated');
      await fs.ensureDir(tempDir);
      const filename = `dream_${Date.now()}.png`;
      const filepath = path.join(tempDir, filename);
      await fs.writeFile(filepath, buffer);

      devLog('✅ Stability AI online');
      devLog('📁 Arquivo gerado:', filepath, `(${buffer.length} bytes)`);

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
      } else {
        devLog('☁ Cloudinary não configurado');
      }

      await fs.remove(filepath);
      devLog('📁 Arquivo local removido');

      const imageUrl = cloudinaryUrl || `data:image/png;base64,${base64}`;

      return {
        imageUrl,
        imageBase64: cloudinaryUrl ? null : `data:image/png;base64,${base64}`,
        cloudinaryPublicId,
        prompt,
        seed: Date.now(),
      };
    } catch (error) {
      const stabStatus = error.response?.status || 500;
      console.error('❌ Image Generation Error');
      console.error('❌ Provider: Stability AI');
      console.error('❌ Status:', stabStatus);
      console.error('❌ Data:', error.response?.data || error.message);

      if (stabStatus === 429) {
        return {
          success: false,
          provider: 'stability',
          status: 429,
          message: 'Limite de uso ou créditos insuficientes',
          error: error.message,
        };
      }
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
