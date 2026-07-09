function optimize({ question, conversationIntent, responseGoal, conversationPlan, cognitiveReasoning, cognitiveDecision, conversationStrategy, emotionalState, adaptiveProfile, cognitiveContext }) {
  const q = (question || '').toLowerCase().trim();
  const i = (conversationIntent && conversationIntent.intent) || '';
  const g = (responseGoal && responseGoal.goal) || '';
  const plan = conversationPlan || {};
  const reasoning = (cognitiveReasoning && cognitiveReasoning.reasoning && cognitiveReasoning.reasoning.line) || '';
  const d = cognitiveDecision || {};
  const s = conversationStrategy || {};
  const emotion = (emotionalState && emotionalState.detectedEmotion) || '';
  const intensity = (emotionalState && emotionalState.emotionalIntensity) || 0;
  const mode = (emotionalState && emotionalState.conversationMode) || '';
  const profile = adaptiveProfile || {};

  let shouldReduceContext = false;
  let shouldIncreaseEmpathy = false;
  let shouldReduceEmpathy = false;
  let shouldIncreaseObjectivity = false;
  let shouldReduceObjectivity = false;
  let shouldSimplifyLanguage = false;
  let shouldDeepenReflection = false;
  let shouldEncourageMore = false;
  let shouldReduceConnections = false;
  let maxContextBlocks = 99;
  let finalTone = (plan && plan.bodyStyle) || 'conversa';
  let finalDepth = (plan && plan.estimatedLength) || 'medium';
  let reason = 'planejamento equilibrado';

  const isFactual = i === 'objective_answer' || d.reason === 'factual' || d.reason === 'factual_short';
  const isEmotional = i === 'vent' || i === 'emotional_support' || g === 'acolher' || g === 'validar_sentimentos' || g === 'reduzir_ansiedade' || g === 'fortalecer_autoestima' || mode === 'support' || mode === 'crisis';
  const isTechnical = i === 'learn' && /como (funciona|fazer|faço|começar|instalar|configurar|criar)/i.test(q);
  const isEvolution = i === 'follow_up' || g === 'incentivar' || reasoning === 'evolutionary' || d.reason === 'evolution';
  const isGreeting = i === 'chat' && !q.includes('preciso') && !q.includes('quero') && (plan && plan.estimatedLength === 'short' && plan.opening === 'acolhedora');
  const isDecision = i === 'decision_help' || g === 'estimular_reflexao' || g === 'estimular_autoconhecimento';
  const isCelebration = i === 'celebrate' || g === 'celebrar';

  const hasHighIntensity = intensity >= 7;
  const hasLowSelfEsteem = g === 'fortalecer_autoestima' && intensity >= 5;
  const hasHighUrgency = (conversationIntent && conversationIntent.urgency >= 7);

  let optimizationScore = 100;

  // Factual / objective questions
  if (isFactual) {
    shouldReduceContext = true;
    shouldReduceConnections = true;
    shouldIncreaseObjectivity = true;
    shouldSimplifyLanguage = true;
    maxContextBlocks = 3;
    finalTone = 'objetivo';
    finalDepth = 'curto';
    optimizationScore -= 10;
    reason = 'pergunta objetiva — contexto mínimo';
  }

  // Technical questions
  if (isTechnical) {
    shouldReduceContext = true;
    shouldReduceConnections = true;
    shouldSimplifyLanguage = true;
    shouldIncreaseObjectivity = true;
    maxContextBlocks = 2;
    finalTone = 'didático';
    finalDepth = 'médio';
    optimizationScore -= 5;
    reason = 'pergunta técnica — foco no conteúdo';
  }

  // Emotional questions
  if (isEmotional) {
    shouldIncreaseEmpathy = true;
    if (hasHighIntensity) shouldIncreaseEmpathy = true;
    if (mode === 'crisis') {
      shouldReduceContext = true;
      shouldReduceConnections = true;
      shouldSimplifyLanguage = true;
      maxContextBlocks = 3;
      finalTone = 'acolhedor';
      finalDepth = 'médio';
      optimizationScore -= 15;
      reason = 'crise emocional — contexto reduzido';
    } else if (hasLowSelfEsteem) {
      shouldEncourageMore = true;
      shouldIncreaseEmpathy = true;
      shouldDeepenReflection = false;
      finalTone = 'valorizador';
      finalDepth = 'médio';
      optimizationScore -= 5;
      reason = 'autoestima — tom valorizador';
    } else {
      finalTone = 'empático';
      finalDepth = plan.estimatedLength || 'medium';
      optimizationScore -= 5;
      reason = 'conteúdo emocional — mantida empatia';
    }
  }

  // Greeting / short social
  if (isGreeting) {
    shouldReduceContext = true;
    shouldReduceConnections = true;
    shouldSimplifyLanguage = true;
    shouldReduceObjectivity = true;
    maxContextBlocks = 1;
    finalTone = 'natural';
    finalDepth = 'curto';
    optimizationScore = 95;
    reason = 'cumprimento — resposta curta';
  }

  // Decision / reflection
  if (isDecision) {
    shouldDeepenReflection = true;
    shouldEncourageMore = false;
    maxContextBlocks = 6;
    finalTone = 'reflexivo';
    finalDepth = 'longo';
    optimizationScore -= 5;
    reason = 'decisão — aprofundar reflexão';
  }

  // Evolution / follow-up
  if (isEvolution) {
    shouldReduceContext = false;
    shouldReduceConnections = false;
    maxContextBlocks = 8;
    finalTone = 'evolutivo';
    finalDepth = 'longo';
    optimizationScore += 5;
    reason = 'evolução — permitir mais contexto';
  }

  // Celebration
  if (isCelebration) {
    shouldIncreaseEmpathy = true;
    shouldEncourageMore = true;
    maxContextBlocks = 5;
    finalTone = 'celebrativo';
    finalDepth = 'médio';
    optimizationScore += 5;
    reason = 'celebração — tom positivo';
  }

  // Detect too many context blocks (cognitiveContext has ~14 blocks)
  const contextKeys = cognitiveContext ? Object.keys(cognitiveContext).filter(k => k.startsWith('active') || k === 'personalContext' || k === 'emotionalContext' || k === 'conversationContext').length : 0;
  if (contextKeys > 8 && !isEvolution && !isDecision) {
    shouldReduceContext = true;
    maxContextBlocks = Math.min(maxContextBlocks, 6);
    optimizationScore -= 10;
    reason += ' — muitos blocos de contexto';
  }

  // Overly objective when emotion is high
  if (hasHighIntensity && reasoning === 'objective') {
    shouldIncreaseEmpathy = true;
    shouldReduceObjectivity = true;
    finalTone = 'empático';
    optimizationScore -= 15;
    reason = 'intensidade alta — tom precisa de empatia';
  }

  // Overly emotional when it's factual
  if (isFactual && finalTone === 'emocional') {
    shouldIncreaseObjectivity = true;
    shouldReduceEmpathy = true;
    finalTone = 'objetivo';
    finalDepth = 'curto';
    optimizationScore -= 10;
    reason = 'pergunta factual — tom deve ser objetivo';
  }

  // Profile-based adjustments
  if (profile.preferredResponseStyle === 'short' && finalDepth !== 'curto') {
    finalDepth = 'curto';
    shouldReduceContext = true;
    optimizationScore -= 5;
    reason += ' — perfil prefere respostas curtas';
  }
  if (profile.preferredEmpathyLevel === 'low' && shouldIncreaseEmpathy) {
    shouldIncreaseEmpathy = false;
    optimizationScore += 5;
    reason += ' — perfil prefere menos empatia';
  }

  // Urgency
  if (hasHighUrgency && !isEmotional) {
    shouldReduceContext = true;
    optimizationScore -= 5;
    reason += ' — urgência detectada';
  }

  // Excessive connections
  if ((plan.maxConnections || 0) > 2) {
    shouldReduceConnections = true;
    optimizationScore -= 5;
    reason += ' — muitas conexões';
  }

  optimizationScore = Math.min(100, Math.max(0, optimizationScore));

  return {
    optimizationScore,
    shouldReduceContext,
    shouldIncreaseEmpathy,
    shouldReduceEmpathy,
    shouldIncreaseObjectivity,
    shouldReduceObjectivity,
    shouldSimplifyLanguage,
    shouldDeepenReflection,
    shouldEncourageMore,
    shouldReduceConnections,
    maxContextBlocks,
    finalTone,
    finalDepth,
    reason,
  };
}

module.exports = { optimize };
