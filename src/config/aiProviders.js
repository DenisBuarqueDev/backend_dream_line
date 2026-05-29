const AI_PROVIDERS = {
  deepseek: {
    primary: {
      url: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat',
      maxTokens: 1000,
      temperature: 0.7,
    },
    fallback: {
      url: process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages',
      model: 'claude-3-haiku-20240307',
      apiKey: process.env.CLAUDE_API_KEY,
    },
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
  },
  flux: {
    primary: {
      url: process.env.FLUX_API_URL || 'https://api.replicate.com/v1/predictions',
      model: 'black-forest-labs/flux-schnell',
      version: '2e8dca5d60b6c0a1b3e5c4f6d7e8f9a0b1c2d3e4',
    },
    fallback: {
      url: process.env.STABLE_DIFFUSION_API_URL || 'https://api.stability.ai/v2beta/stable-image/generate/core',
      apiKey: process.env.STABLE_DIFFUSION_API_KEY,
    },
    timeout: 60000,
    retries: 2,
    retryDelay: 2000,
  },
  whisper: {
    primary: {
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      model: 'whisper-large-v3-turbo',
      apiKey: process.env.GROQ_API_KEY,
    },
    fallback: {
      provider: 'web-speech-api',
    },
    timeout: 30000,
    retries: 3,
    retryDelay: 1500,
    maxFileSize: 25 * 1024 * 1024,
    allowedFormats: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a', 'audio/x-m4a'],
  },
};

const FEATURE_ROUTING = {
  dreamInterpretation: 'deepseek',
  emotionalAnalysis: 'deepseek',
  numerology: 'deepseek',
  spiritualMessages: 'deepseek',
  imageGeneration: 'flux',
  audioTranscription: 'whisper',
};

module.exports = { AI_PROVIDERS, FEATURE_ROUTING };
