const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { AI_PROVIDERS } = require('../../config/aiProviders');

const TEST_PROMPT = 'surreal dream, spiritual atmosphere, cinematic lighting, ethereal landscape, dreamcore, mystical';

async function testFlux() {
  const log = [];
  const start = Date.now();
  const apiKey = process.env.FLUX_API_KEY || process.env.REPLICATE_API_KEY;
  let status = 'offline';
  let imageUrl = null;
  let seed = null;

  log.push({ time: new Date().toISOString(), type: 'info', message: 'Iniciando teste FLUX (Replicate)...' });

  if (!apiKey) {
    log.push({ time: new Date().toISOString(), type: 'error', message: '❌ FLUX_API_KEY/REPLICATE_API_KEY não encontrada' });
    return testFallbackStableDiffusion(log, start);
  }

  const config = AI_PROVIDERS.flux.primary;

  try {
    log.push({ time: new Date().toISOString(), type: 'info', message: `Enviando prompt para ${config.url}` });
    log.push({ time: new Date().toISOString(), type: 'debug', message: `Prompt: "${TEST_PROMPT}"` });

    const prediction = await axios({
      url: config.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`,
      },
      data: {
        version: config.version,
        input: {
          prompt: TEST_PROMPT,
          num_outputs: 1,
          aspect_ratio: '16:9',
          output_format: 'webp',
          num_inference_steps: 4,
        },
      },
      timeout: AI_PROVIDERS.flux.timeout,
    });

    const predictionId = prediction.data.id;
    log.push({ time: new Date().toISOString(), type: 'info', message: `Prediction ID: ${predictionId}` });

    if (prediction.data.urls?.get) {
      log.push({ time: new Date().toISOString(), type: 'info', message: 'Aguardando conclusão da geração...' });

      const result = await pollPrediction(prediction.data.urls.get, apiKey, log);
      imageUrl = result.output?.[0] || null;
      seed = result.metrics?.predict_time ? Math.floor(result.metrics.predict_time * 1000) : null;
      status = imageUrl ? 'online' : 'offline';

      if (imageUrl) {
        const tempDir = path.join(__dirname, '..', '..', '..', 'tmp', 'tests');
        await fs.ensureDir(tempDir);
        const imgPath = path.join(tempDir, `flux_test_${Date.now()}.webp`);
        const imgResponse = await axios({ url: imageUrl, responseType: 'arraybuffer', timeout: 10000 });
        await fs.writeFile(imgPath, imgResponse.data);
        log.push({ time: new Date().toISOString(), type: 'success', message: `✅ Imagem salva em: ${imgPath}` });
      }
    }

    const elapsed = Date.now() - start;
    log.push({ time: new Date().toISOString(), type: 'success', message: `✅ FLUX concluído em ${elapsed}ms` });
    return { provider: 'flux', status, elapsed, imageUrl, seed, log };

  } catch (error) {
    log.push({ time: new Date().toISOString(), type: 'error', message: `❌ FLUX falhou: ${error.message}` });
    return testFallbackStableDiffusion(log, start);
  }
}

async function pollPrediction(url, apiKey, log, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await axios({
      url,
      method: 'GET',
      headers: { 'Authorization': `Token ${apiKey}` },
      timeout: 5000,
    });

    const status = response.data.status;
    if (status === 'succeeded') {
      log.push({ time: new Date().toISOString(), type: 'success', message: `Geração concluída na tentativa ${i + 1}` });
      return response.data;
    }
    if (status === 'failed') {
      throw new Error(response.data.error || 'Prediction failed');
    }

    if (i === 5 || i === 15) {
      log.push({ time: new Date().toISOString(), type: 'info', message: `Aguardando... (${i + 1}s)` });
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Timeout aguardando geração FLUX');
}

async function testFallbackStableDiffusion(log, start) {
  log.push({ time: new Date().toISOString(), type: 'info', message: 'Tentando fallback: Stability AI (v2beta)...' });

  const fallback = AI_PROVIDERS.flux.fallback;
  const apiKey = fallback.apiKey || process.env.STABLE_DIFFUSION_API_KEY;

  if (!apiKey) {
    log.push({ time: new Date().toISOString(), type: 'error', message: '❌ STABLE_DIFFUSION_API_KEY não encontrada' });
    log.push({ time: new Date().toISOString(), type: 'warning', message: '💡 Configure FLUX_API_KEY ou STABLE_DIFFUSION_API_KEY' });
    return { provider: 'flux', status: 'offline', elapsed: Date.now() - start, imageUrl: null, seed: null, log };
  }

  try {
    log.push({ time: new Date().toISOString(), type: 'info', message: 'Usando multipart/form-data + arraybuffer (v2beta)' });

    const FormData = require('form-data');
    const form = new FormData();
    form.append('prompt', TEST_PROMPT);
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
    const tempDir = path.join(__dirname, '..', '..', '..', 'tmp', 'tests');
    await fs.ensureDir(tempDir);
    const filepath = path.join(tempDir, `stability_test_${Date.now()}.png`);
    await fs.writeFile(filepath, buffer);

    const elapsed = Date.now() - start;
    console.log('Stability AI online');
    log.push({ time: new Date().toISOString(), type: 'success', message: `✅ Stability AI imagem salva em: ${filepath}` });
    return { provider: 'flux', status: 'online', elapsed, imageUrl: filepath, seed: null, fallback: 'stability', log };
  } catch (error) {
    console.error('Stability AI error:', error.response?.data || error.message);
    log.push({ time: new Date().toISOString(), type: 'error', message: `❌ Stability AI falhou: ${error.message}` });
    return { provider: 'flux', status: 'offline', elapsed: Date.now() - start, imageUrl: null, seed: null, log };
  }
}

module.exports = { testFlux };
