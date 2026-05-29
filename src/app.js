require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const securityMiddleware = require('./middleware/securityMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');
const { logEnvStatus } = require('./utils/envValidator');

const app = express();

securityMiddleware(app);

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required in .env');
  process.exit(1);
}

connectDB();

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
app.use('/api/test', require('./routes/testRoutes'));
app.use('/api/health', require('./routes/healthRoutes'));

app.get('/health', (_req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

app.use(errorMiddleware);

logEnvStatus();

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origens: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : '*'}`);
});

module.exports = app;
