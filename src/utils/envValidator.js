const REQUIRED_KEYS = [
  { key: 'MONGO_URI', label: 'MongoDB', required: true },
  { key: 'JWT_SECRET', label: 'JWT', required: true },
];

const AI_KEYS = [
  { key: 'DEEPSEEK_API_KEY', label: 'DeepSeek', env: 'DEEPSEEK_API_KEY || AI_API_KEY' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI/Whisper', env: 'OPENAI_API_KEY' },
  { key: 'GROQ_API_KEY', label: 'Groq Whisper', env: 'GROQ_API_KEY' },
  { key: 'FLUX_API_KEY', label: 'FLUX/Replicate', env: 'FLUX_API_KEY || REPLICATE_API_KEY' },
  { key: 'CLAUDE_API_KEY', label: 'Claude (fallback)', env: 'CLAUDE_API_KEY' },
  { key: 'STABLE_DIFFUSION_API_KEY', label: 'Stability AI (fallback)', env: 'STABLE_DIFFUSION_API_KEY' },
];

function validateEnv() {
  const warnings = [];
  const errors = [];
  const missingAI = [];

  for (const { key, label, required } of REQUIRED_KEYS) {
    if (!process.env[key]) {
      if (required) {
        errors.push(`❌ ${label}: ${key} é obrigatória`);
      }
    }
  }

  const useGateway = process.env.USE_AI_GATEWAY === 'true';

  if (useGateway) {
    const hasDeepSeek = !!(process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY);
    if (!hasDeepSeek) {
      warnings.push('⚠️ DeepSeek: Nenhuma API key configurada (DEEPSEEK_API_KEY ou AI_API_KEY)');
      warnings.push('   💡 O gateway usará o sistema legado (mock) como fallback');
    }

    const hasGroqWhisper = !!process.env.GROQ_API_KEY;
    if (hasGroqWhisper) {
      warnings.push('✅ Groq Whisper: GROQ_API_KEY configurada');
    } else {
      warnings.push('⚠️ Groq Whisper: GROQ_API_KEY não configurada');
      warnings.push('   💡 Transcrição de áudio via Web Speech API (navegador) será usada como fallback');
    }
  }

  for (const { key, label, env } of AI_KEYS) {
    if (!process.env[key] && !key.includes('||')) {
      missingAI.push({ key, label, env });
    }
  }

  if (missingAI.length > 0) {
    warnings.push('');
    warnings.push('📋 APIs de IA disponíveis para configuração:');
    for (const { key, label, env } of missingAI) {
      warnings.push(`   • ${label}: ${env}`);
    }
    warnings.push('   💡 Nenhuma é obrigatória — o sistema funciona em modo mock sem elas');
  }

  return { errors, warnings };
}

function logEnvStatus() {
  const { errors, warnings } = validateEnv();

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  🔍 VALIDAÇÃO DE AMBIENTE');
  console.log('═══════════════════════════════════════');

  if (errors.length > 0) {
    errors.forEach(e => console.log(`  ${e}`));
    console.log('');
    errors.forEach(e => {
      if (e.includes('MONGO_URI') || e.includes('JWT_SECRET')) {
        console.log('  🛑 Erro crítico — servidor não pode iniciar');
      }
    });
    console.log('');
  }

  if (warnings.length > 0) {
    warnings.forEach(w => console.log(`  ${w}`));
    console.log('');
  }

  const gatewayMode = process.env.USE_AI_GATEWAY === 'true' ? 'NOVA (gateway)' : 'Legado (mock)';
  console.log(`  🤖 Modo IA: ${gatewayMode}`);
  console.log('═══════════════════════════════════════');
  console.log('');
}

module.exports = { validateEnv, logEnvStatus };
