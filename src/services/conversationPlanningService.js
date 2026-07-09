function definePlan(question, intent, goal, strategy, decisions, reasoning, emotionalState, context) {
  const q = (question || '').toLowerCase().trim();
  const i = (intent && intent.intent) || '';
  const g = (goal && goal.goal) || '';
  const s = strategy || {};
  const d = decisions || {};
  const r = (reasoning && reasoning.reasoning && reasoning.reasoning.line) || '';
  const emotion = (emotionalState && emotionalState.detectedEmotion) || '';
  const intensity = (emotionalState && emotionalState.emotionalIntensity) || 0;
  const mode = (emotionalState && emotionalState.conversationMode) || '';
  const words = q.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const isGreeting = wordCount <= 6 && /^(oi|ol[áa]|tudo bem|bom dia|boa tarde|boa noite|hey|e a[ií]|fala[ia])/i.test(q);
  const isFarewell = wordCount <= 4 && /^(tchau|at[eé] (logo|mais|breve)|flw|falou|at[eé]|bye)/i.test(q);
  const isShortAnswer = wordCount <= 3 && /^(sim|n[aã]o|[aá]h|ok|okay|obrigad[oa]|valeu|nada|talvez|entendi|claro|verdade|concordo)/i.test(q);
  const hasAnxiety = /ansiedade|ansios[oa]|preocupa|medo|nervos[oa]/i.test(q);
  const hasSadness = /triste|deprimid[oa]|desanimad[oa]|sem (esperança|vontade|[aá]nimo)|chorar/i.test(q);
  const hasAchievement = /consegui|alcancei|realizei|cumpri|venci|superei|passei|conquistei/i.test(q);
  const hasDecision = /n[aã]o sei (o que|se|qual)|estou em d[úu]vida|d[úu]vida|escolher|decidir|entre (duas|várias|essas) opç[õo]es/i.test(q);
  const hasAction = /como (fazer|faço|começar|iniciar|praticar|aplicar)|quero (aprender|tentar|fazer)/i.test(q);
  const hasCuriosity = /curiosidade|curios[oa]|interessante|nunca ouvi/i.test(q);
  const hasMemorySignal = /lembra (que|da|de)|conversamos|falamos|outro dia|da outra vez|na última vez/i.test(q);

  let opening = 'natural';
  let bodyStyle = 'conversa';
  let closing = 'natural';
  let shouldAskQuestion = false;
  let shouldUseMemoryConnection = false;
  let shouldUseExample = false;
  let shouldUseMetaphor = false;
  let estimatedLength = 'medium';
  let maxConnections = 1;
  let reason = 'fluxo padrão';

  if (isGreeting) {
    opening = 'acolhedora';
    bodyStyle = 'conversa';
    closing = 'pergunta_aberta';
    shouldAskQuestion = true;
    estimatedLength = 'short';
    maxConnections = 0;
    reason = 'cumprimento';
  } else if (isFarewell || (isShortAnswer && i === 'chat')) {
    opening = 'natural';
    bodyStyle = 'curto';
    closing = 'encerramento';
    shouldAskQuestion = false;
    estimatedLength = 'short';
    maxConnections = 0;
    reason = 'despedida';
  } else if (i === 'celebrate' || hasAchievement || g === 'celebrar') {
    opening = 'celebrativa';
    bodyStyle = 'emocional';
    closing = 'pergunta_aberta';
    shouldAskQuestion = true;
    shouldUseMemoryConnection = d.useMemoryFacts !== false;
    estimatedLength = 'medium';
    maxConnections = Math.min(d.maxConnections || 1, 1);
    reason = 'celebração';
  } else if (i === 'vent' || (g === 'acolher' || g === 'reduzir_ansiedade' || g === 'validar_sentimentos' || g === 'fortalecer_autoestima')) {
    opening = 'acolhedora';
    bodyStyle = 'emocional';
    closing = hasAnxiety || hasSadness ? 'incentivo' : 'pergunta_aberta';
    shouldAskQuestion = mode !== 'crisis';
    shouldUseMemoryConnection = false;
    shouldUseExample = false;
    shouldUseMetaphor = hasAnxiety || g === 'reduzir_ansiedade';
    estimatedLength = intensity >= 7 ? 'medium' : 'medium';
    maxConnections = 0;
    reason = 'acolhimento emocional';
    if (g === 'reduzir_ansiedade') {
      shouldUseMetaphor = true;
      bodyStyle = 'emocional';
      closing = 'incentivo';
    }
    if (g === 'fortalecer_autoestima') {
      shouldUseExample = true;
      bodyStyle = 'emocional';
      closing = 'incentivo';
    }
  } else if (i === 'emotional_support' || g === 'validar_sentimentos') {
    opening = 'acolhedora';
    bodyStyle = 'emocional';
    closing = 'pergunta_aberta';
    shouldAskQuestion = true;
    estimatedLength = 'medium';
    maxConnections = 0;
    reason = 'apoio emocional';
  } else if (i === 'decision_help' || hasDecision) {
    opening = 'reflexiva';
    bodyStyle = 'reflexivo';
    closing = 'reflexao';
    shouldAskQuestion = true;
    shouldUseExample = true;
    estimatedLength = 'long';
    maxConnections = 1;
    reason = 'ajuda para decisão';
  } else if (i === 'advice' || hasAction) {
    opening = 'reflexiva';
    bodyStyle = 'prático';
    closing = 'sugestao';
    shouldAskQuestion = true;
    shouldUseExample = true;
    estimatedLength = 'medium';
    maxConnections = 1;
    reason = 'conselho ou ação';
  } else if (i === 'dream_interpretation') {
    opening = 'reflexiva';
    bodyStyle = 'explicativo';
    closing = 'pergunta_aberta';
    shouldAskQuestion = true;
    shouldUseExample = true;
    shouldUseMetaphor = true;
    estimatedLength = 'medium';
    maxConnections = d.maxConnections || 1;
    reason = 'interpretação de sonhos';
  } else if (i === 'reflect' || g === 'estimular_reflexao' || g === 'estimular_autoconhecimento') {
    opening = 'reflexiva';
    bodyStyle = 'reflexivo';
    closing = 'reflexao';
    shouldAskQuestion = true;
    shouldUseExample = false;
    estimatedLength = 'medium';
    maxConnections = 1;
    reason = 'reflexão';
  } else if (i === 'follow_up') {
    opening = 'natural';
    bodyStyle = 'conversa';
    closing = 'pergunta_aberta';
    shouldAskQuestion = true;
    shouldUseMemoryConnection = true;
    estimatedLength = 'medium';
    maxConnections = 1;
    reason = 'acompanhamento';
  } else if (i === 'learn' || hasCuriosity) {
    opening = 'informativa';
    bodyStyle = 'explicativo';
    closing = 'pergunta_aberta';
    shouldAskQuestion = hasCuriosity;
    shouldUseExample = true;
    estimatedLength = 'medium';
    maxConnections = 0;
    reason = 'aprendizado';
  } else if (i === 'objective_answer' || (d.reason === 'factual' || d.reason === 'factual_short')) {
    opening = 'direta';
    bodyStyle = 'curto';
    closing = 'natural';
    shouldAskQuestion = false;
    estimatedLength = 'short';
    maxConnections = d.maxConnections !== undefined ? d.maxConnections : 0;
    reason = 'resposta objetiva';
  } else if (hasMemorySignal) {
    opening = 'natural';
    bodyStyle = 'conversa';
    closing = 'pergunta_aberta';
    shouldAskQuestion = true;
    shouldUseMemoryConnection = true;
    estimatedLength = 'medium';
    maxConnections = 1;
    reason = 'memória ativada';
  } else {
    opening = r === 'empathic' ? 'acolhedora' : r === 'evolutionary' ? 'reflexiva' : 'natural';
    bodyStyle = r === 'factual' || r === 'objective' ? 'curto' : 'conversa';
    closing = s.shouldAskFollowUp ? 'pergunta_aberta' : 'natural';
    shouldAskQuestion = s.shouldAskFollowUp === true;
    shouldUseMemoryConnection = d.useMemoryFacts !== false && !d.reason?.includes('factual');
    estimatedLength = s.depth === 'profunda' ? 'long' : s.depth === 'superficial' ? 'short' : 'medium';
    maxConnections = d.maxConnections !== undefined ? d.maxConnections : 1;
    reason = 'plano baseado em raciocínio';
  }

  if (d.maxConnections !== undefined && maxConnections > d.maxConnections) {
    maxConnections = d.maxConnections;
  }

  return {
    opening,
    bodyStyle,
    closing,
    shouldAskQuestion,
    shouldUseMemoryConnection,
    shouldUseExample,
    shouldUseMetaphor,
    estimatedLength,
    maxConnections,
    reason,
  };
}

module.exports = { definePlan };
