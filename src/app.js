require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');
const securityMiddleware = require('./middleware/securityMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');
const path = require('path');
const { logEnvStatus } = require('./utils/envValidator');
const { startScheduler } = require('./services/notificationScheduler');

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.error('CORS_ORIGIN is required in production');
  process.exit(1);
}

const corsOptions = {
  origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use('/api/payments/webhook', (req, _res, next) => {
  console.log('[MP ENTRY]', req.method, req.originalUrl, req.headers['content-type'], Object.keys(req.body || {}).length ? 'body OK' : 'body vazio');
  next();
});

securityMiddleware(app);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required in .env');
  process.exit(1);
}

connectDB();

const generatedDir = path.join(__dirname, '..', 'temp', 'generated');
app.use('/temp/generated', express.static(generatedDir));
console.log('📁 Servindo arquivos estáticos de:', generatedDir);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/dreams', require('./routes/dreamRoutes'));
app.use('/api/astral-charts', require('./routes/astralChartRoutes'));
app.use('/api/numerology', require('./routes/numerologyRoutes'));
app.use('/api/energy', require('./routes/energyPanelRoutes'));
app.use('/api/lucky-numbers', require('./routes/luckyNumberRoutes'));
app.use('/api/transcribe-audio', require('./routes/transcribeRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/ai', require('./routes/aiStatusRoutes'));
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/test', require('./routes/testRoutes'));
}
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/subscription', require('./routes/subscriptionRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/insights', require('./routes/dreamEmotionCorrelationRoutes'));
app.use('/api/emotions', require('./routes/emotionInsightsRoutes'));
app.use('/api/emotions', require('./routes/emotionRoutes'));


if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/image-providers', (_req, res) => {
    res.json({
      flux: process.env.FLUX_API_KEY || process.env.REPLICATE_API_KEY ? 'online' : 'offline',
      stability: process.env.STABLE_DIFFUSION_API_KEY ? 'online' : 'offline',
      credits: {
        replicate: process.env.REPLICATE_API_KEY ? 'configurado' : 'ausente',
        stability: process.env.STABLE_DIFFUSION_API_KEY ? 'configurado' : 'ausente',
      },
      lastError: null,
      timestamp: new Date().toISOString(),
    });
  });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

app.use(errorMiddleware);

logEnvStatus();

if (process.env.NODE_ENV !== 'production') {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  🧪 DIAGNÓSTICO DE IA');
  console.log('═══════════════════════════════════════');

  function checkApi(key, label, condition) {
    if (condition) {
      console.log(`  ✅ ${label} conectado`);
    } else {
      console.log(`  ❌ ${label} ${key ? 'sem ' + key : 'offline'}`);
    }
  }

  checkApi('DEEPSEEK_API_KEY', 'DeepSeek', !!(process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY));
  checkApi('FLUX_API_KEY', 'FLUX', !!(process.env.FLUX_API_KEY || process.env.REPLICATE_API_KEY));
  checkApi('CLAUDE_API_KEY', 'Claude', !!process.env.CLAUDE_API_KEY);
  checkApi('STABLE_DIFFUSION_API_KEY', 'Stability', !!process.env.STABLE_DIFFUSION_API_KEY);
  checkApi('GROQ_API_KEY', 'Groq Whisper', !!process.env.GROQ_API_KEY);

  console.log('═══════════════════════════════════════');
  console.log('');
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    const expired = await User.expireOverdue();
    if (expired > 0) {
      console.log(`[Expiry] ${expired} assinatura(s) expirada(s) na inicialização`);
    }
  } catch (err) {
    console.error('[Expiry] Erro ao expirar assinaturas:', err.message);
  }

  startScheduler();

  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origens: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : '*'}`);
});

module.exports = app;
