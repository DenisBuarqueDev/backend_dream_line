const aiGateway = require('../../services/ai/aiGatewayService');

async function testGateway() {
  const log = [];
  const start = Date.now();

  log.push({ time: new Date().toISOString(), type: 'info', message: 'Iniciando teste do AI Gateway...' });
  log.push({ time: new Date().toISOString(), type: 'info', message: `USE_AI_GATEWAY: ${aiGateway.USE_NEW_ARCHITECTURE}` });

  const routing = aiGateway.getRoutingInfo();
  log.push({ time: new Date().toISOString(), type: 'info', message: `Routing ativo: ${routing.active}` });
  log.push({ time: new Date().toISOString(), type: 'debug', message: `Features: ${JSON.stringify(routing.features)}` });

  let gatewayStatus = 'online';
  const steps = [];

  if (!process.env.DEEPSEEK_API_KEY && !process.env.AI_API_KEY) {
    log.push({ time: new Date().toISOString(), type: 'warning', message: '⚠️ Nenhuma API key configurada para DeepSeek ou OpenAI' });
    gatewayStatus = 'offline';
  }

  const testDream = 'Sonhei que estava em uma floresta escura e via uma luz ao longe. Caminhei em direção à luz e encontrei um lago cristalino.';

  log.push({ time: new Date().toISOString(), type: 'info', message: `Interpretando sonho de teste...` });

  try {
    const userContext = { sunSign: 'Áries', moonSign: 'Câncer', ascendant: 'Leão' };

    const result = await aiGateway.processDreamPipeline(testDream, userContext, {
      generateImage: false,
      psychologicalAnalysis: true,
    });

    const elapsed = Date.now() - start;

    steps.push({ name: 'interpretation', status: result.interpretation ? 'success' : 'error' });
    steps.push({ name: 'provider', status: result.provider });
    if (result.emotions.length > 0) steps.push({ name: 'emotions', status: 'success', count: result.emotions.length });
    if (result.numerology) steps.push({ name: 'numerology', status: 'success' });
    if (result.spiritualMessage) steps.push({ name: 'spiritualMessage', status: 'success' });
    if (result.psychologicalAnalysis) steps.push({ name: 'psychologicalAnalysis', status: 'success' });

    log.push({ time: new Date().toISOString(), type: 'success', message: `✅ Gateway concluído em ${elapsed}ms` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Provider: ${result.provider}` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Interpretação: ${result.interpretation.substring(0, 150)}...` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Emoções: ${result.emotions.join(', ') || 'N/A'}` });
    log.push({ time: new Date().toISOString(), type: 'info', message: `Mensagem espiritual: ${result.spiritualMessage || 'N/A'}` });

    return {
      provider: 'gateway',
      status: gatewayStatus,
      elapsed,
      steps,
      routing,
      resultPreview: {
        interpretationLength: result.interpretation.length,
        emotions: result.emotions,
        hasNumerology: !!result.numerology,
        hasSpiritualMessage: !!result.spiritualMessage,
        hasPsychologicalAnalysis: !!result.psychologicalAnalysis,
      },
      log,
    };

  } catch (error) {
    const elapsed = Date.now() - start;
    gatewayStatus = 'offline';

    log.push({ time: new Date().toISOString(), type: 'error', message: `❌ Gateway falhou: ${error.message}` });

    return {
      provider: 'gateway',
      status: gatewayStatus,
      elapsed,
      steps,
      routing,
      error: error.message,
      log,
    };
  }
}

module.exports = { testGateway };
