function defineGoal(question, intent, plan, emotionalState, context) {
  const q = (question || '').toLowerCase().trim();
  const i = (intent && intent.intent) || '';
  const rt = (plan && plan.responseType) || '';
  const emotion = (emotionalState && emotionalState.detectedEmotion) || '';
  const mode = (emotionalState && emotionalState.conversationMode) || '';
  const intensity = (emotionalState && emotionalState.emotionalIntensity) || 0;
  const words = q.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const isGreeting = wordCount <= 6 && /^(oi|ol[áa]|tudo bem|bom dia|boa tarde|boa noite|hey|e a[ií]|fala[ia])/i.test(q);
  const isFarewell = wordCount <= 4 && /^(tchau|at[eé] (logo|mais|breve)|flw|falou|at[eé]|bye)/i.test(q);
  const hasAnxiety = /ansiedade|ansios[oa]|preocupa|medo|nervos[oa]/i.test(q);
  const hasLowSelfEsteem = /n[aã]o (sou|consigo|mere[cç]o)|incapaz|in[uú]til|fracass[oa]|pessoa (horrível|terrível)|odeio (mim|me)/i.test(q);
  const hasSadness = /triste|deprimid[oa]|desanimad[oa]|sem (esperança|vontade|[aá]nimo)|chorar/i.test(q);
  const hasAchievement = /consegui|alcancei|realizei|cumpri|venci|superei|passei|conquistei/i.test(q);
  const hasReflection = /o que (voc[êe] acha|acha disso|pensas? sobre)|refletir|reflex[aã]o|auto(análise|conhecimento)/i.test(q);
  const hasCuriosity = /curiosidade|curios[oa]|interessante|nunca ouvi|sabia que/i.test(q);
  const hasDecision = /n[aã]o sei (o que|se|qual)|estou em d[úu]vida|d[úu]vida|escolher|decidir|entre (duas|várias|essas) opç[õo]es/i.test(q);
  const hasLearning = /como funciona|o que é|o que significa|explica|aprender|entender|pode me explicar/i.test(q);
  const hasAdvice = /conselho|recomenda|o que (voc[êe] (faria|recomenda)|devo fazer)|como (melhorar|superar|lidar|enfrentar)/i.test(q);
  const hasAction = /como (fazer|começar|iniciar|praticar|aplicar)|quero (aprender|tentar|fazer)|pode me ajudar/i.test(q);
  const isShort = wordCount <= 3 && /^(sim|n[aã]o|[aá]h|ok|okay|obrigad[oa]|valeu|nada|talvez|entendi|claro|verdade|concordo)/i.test(q);

  let goal = 'manter_conversa_aberta';
  let priority = 'low';
  let expectedEmotion = 'neutro';
  let responseDirection = 'natural';
  let shouldEndConversation = false;
  let shouldEncourageAction = false;
  let shouldPromoteReflection = false;
  let shouldCelebrate = false;
  let shouldTeach = false;
  let reason = 'fluxo normal';

  if (isFarewell || (isShort && (i === 'chat' || i === 'objective_answer'))) {
    goal = 'encerrar_naturalmente';
    priority = 'low';
    expectedEmotion = 'neutro';
    responseDirection = 'curto e natural';
    shouldEndConversation = true;
    reason = 'despedida ou resposta curta';
  } else if (isGreeting) {
    goal = 'manter_conversa_aberta';
    priority = 'low';
    expectedEmotion = 'acolhimento';
    responseDirection = 'aberto e amigável';
    reason = 'cumprimento';
  } else if (i === 'celebrate' || hasAchievement || mode === 'celebration') {
    goal = 'celebrar';
    priority = 'high';
    expectedEmotion = 'alegria';
    responseDirection = 'comemorativo';
    shouldCelebrate = true;
    reason = 'conquista do usuário';
  } else if (i === 'vent' || (i === 'emotional_support' && intensity >= 6)) {
    goal = 'acolher';
    priority = 'high';
    expectedEmotion = 'acolhimento';
    responseDirection = 'acolhedor e empático';
    shouldEndConversation = false;
    reason = 'desabafo ou sofrimento emocional';
    if (hasAnxiety) {
      goal = 'reduzir_ansiedade';
      priority = 'high';
      expectedEmotion = 'calma';
      responseDirection = 'calmo e tranquilizador';
      reason = 'ansiedade identificada no desabafo';
    }
    if (hasLowSelfEsteem) {
      goal = 'fortalecer_autoestima';
      priority = 'high';
      expectedEmotion = 'segurança';
      responseDirection = 'valorizador e encorajador';
      reason = 'baixa autoestima detectada';
    }
  } else if (i === 'emotional_support') {
    goal = 'validar_sentimentos';
    priority = 'medium';
    expectedEmotion = 'acolhimento';
    responseDirection = 'empático e validante';
    reason = 'expressão emocional';
    if (hasAnxiety) {
      goal = 'reduzir_ansiedade';
      priority = 'high';
      expectedEmotion = 'calma';
      responseDirection = 'calmo e tranquilizador';
      reason = 'ansiedade identificada';
    }
    if (hasLowSelfEsteem) {
      goal = 'fortalecer_autoestima';
      priority = 'high';
      expectedEmotion = 'segurança';
      responseDirection = 'valorizador e encorajador';
      reason = 'baixa autoestima detectada';
    }
  } else if (i === 'decision_help') {
    goal = 'estimular_reflexao';
    priority = 'high';
    expectedEmotion = 'clareza';
    responseDirection = 'reflexivo e estruturado';
    shouldPromoteReflection = true;
    reason = 'ajuda para decisão';
  } else if (i === 'advice') {
    goal = 'incentivar';
    priority = 'high';
    expectedEmotion = 'motivação';
    responseDirection = 'encorajador e prático';
    shouldEncourageAction = true;
    reason = 'solicitação de conselho';
    if (hasAction) {
      goal = 'sugerir_pequena_acao';
      priority = 'medium';
      expectedEmotion = 'motivação';
      responseDirection = 'prático e gradual';
      shouldEncourageAction = true;
      reason = 'disposição para agir';
    }
    if (hasLowSelfEsteem) {
      goal = 'fortalecer_autoestima';
      priority = 'high';
      expectedEmotion = 'segurança';
      responseDirection = 'valorizador e encorajador';
      reason = 'baixa autoestima em conselho';
    }
  } else if (i === 'dream_interpretation') {
    goal = 'esclarecer';
    priority = 'medium';
    expectedEmotion = 'curiosidade';
    responseDirection = 'exploratório e simbólico';
    shouldPromoteReflection = true;
    reason = 'interpretação de sonhos';
  } else if (i === 'reflect') {
    goal = 'estimular_autoconhecimento';
    priority = 'medium';
    expectedEmotion = 'introspecção';
    responseDirection = 'reflexivo e profundo';
    shouldPromoteReflection = true;
    reason = 'pedido de reflexão';
  } else if (i === 'follow_up') {
    goal = 'incentivar';
    priority = 'medium';
    expectedEmotion = 'motivação';
    responseDirection = 'acompanhamento';
    reason = 'acompanhamento de jornada';
    shouldEncourageAction = true;
  } else if (i === 'learn' || hasLearning) {
    goal = 'ensinar';
    priority = 'medium';
    expectedEmotion = 'aprendizado';
    responseDirection = 'educativo e claro';
    shouldTeach = true;
    reason = 'desejo de aprender';
  } else if (i === 'curious') {
    goal = 'esclarecer';
    priority = 'low';
    expectedEmotion = 'curiosidade';
    responseDirection = 'informativo e leve';
    shouldTeach = true;
    reason = 'curiosidade';
  } else if (i === 'objective_answer' || rt === 'factual_question') {
    goal = 'esclarecer';
    priority = 'medium';
    expectedEmotion = 'neutro';
    responseDirection = 'objetivo e direto';
    reason = 'pergunta objetiva';
  } else if (hasSadness) {
    goal = 'validar_sentimentos';
    priority = 'high';
    expectedEmotion = 'acolhimento';
    responseDirection = 'empático e acolhedor';
    reason = 'tristeza identificada';
    if (intensity >= 6) {
      goal = 'acolher';
      expectedEmotion = 'acolhimento profundo';
      responseDirection = 'acolhedor e presente';
      reason = 'tristeza intensa';
    }
  } else if (hasReflection) {
    goal = 'estimular_reflexao';
    priority = 'medium';
    expectedEmotion = 'introspecção';
    responseDirection = 'reflexivo';
    shouldPromoteReflection = true;
    reason = 'convite à reflexão';
  } else if (hasDecision) {
    goal = 'estimular_autoconhecimento';
    priority = 'medium';
    expectedEmotion = 'clareza';
    responseDirection = 'reflexivo e apoiador';
    shouldPromoteReflection = true;
    reason = 'dúvida do usuário';
  } else {
    goal = 'manter_conversa_aberta';
    priority = 'low';
    expectedEmotion = 'neutro';
    responseDirection = 'natural';
    reason = 'conversa geral';
  }

  return {
    goal,
    priority,
    expectedEmotion,
    responseDirection,
    shouldEndConversation,
    shouldEncourageAction,
    shouldPromoteReflection,
    shouldCelebrate,
    shouldTeach,
    reason,
  };
}

module.exports = { defineGoal };
