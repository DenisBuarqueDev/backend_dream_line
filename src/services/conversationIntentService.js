function detectIntent(question, context, plan, emotionalState) {
  const q = (question || '').toLowerCase().trim();
  const rt = (plan && plan.responseType) || '';
  const pt = (plan && plan.primaryTopic) || '';
  const emotion = (emotionalState && emotionalState.detectedEmotion) || '';
  const mode = (emotionalState && emotionalState.conversationMode) || '';
  const intensity = (emotionalState && emotionalState.emotionalIntensity) || 0;

  const words = q.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const isGreeting = /^(oi|ol[áa]|tudo bem|bom dia|boa tarde|boa noite|hey|e a[ií]|fala[ia])/i.test(q) && wordCount <= 6;
  const isFarewell = /^(tchau|at[eé] (logo|mais|breve)|flw|falou|at[eé]|bye|at[eé] amanh[ãa])/i.test(q) && wordCount <= 4;
  const isShortAnswer = /^(sim|n[aã]o|[aá]h|ok|okay|obrigad[oa]|valeu|nada|talvez|entendi|claro|pode ser|verdade|concordo)/i.test(q) && wordCount <= 3;
  const isFactualQuestion = rt === 'factual_question' || /^(qual|quanto|quantas|quantos|que horas|como (funciona|faço)|o que (é|são)|onde|quando)/i.test(q);
  const isExpressionOfNeed = /precis[oa] (de|ajuda|falar|desabafar|conselho|saber|entender)|t[oô] precisando|me ajuda|me d[ea] (um|uma)/i.test(q);
  const isVenting = /desabafar|desabaf[oa]r|precis[oa] falar|t[oô] (passando|vivendo|enfrentando)|(não|nao) (t[oô]|estou) bem|t[oô] (mal|triste|péssimo|cansad[oa]|esgotado)/i.test(q) && !isFactualQuestion;
  const isReflection = rt === 'reflection' || /o que (voc[êe] acha|acha disso|pensas? sobre)|refletir|reflex[aã]o|auto(análise|conhecimento|estima)/i.test(q);
  const isAdviceSeeking = /conselho|recomenda|o que (voc[êe] (faria|recomenda)|devo fazer)|como (melhorar|superar|lidar|enfrentar)|deveria|qual (a melhor|seria|devo)/i.test(q) && !isReflection && !isFactualQuestion;
  const isDecisionHelp = /n[aã]o sei (o que|se|qual)|estou em d[úu]vida|d[úu]vida|escolher|decidir|entre (duas|várias|essas) opç[õo]es|opção|alternativa/i.test(q);
  const isLearning = /como (funciona|fazer|faço|começar|iniciar|praticar|aplicar)|o que é|o que significa|explica|aprender|entender|curiosidade|curios[oa]|queria saber|saberia me dizer|pode me explicar/i.test(q);
  const isCuriosity = /curiosidade|só por curiosidade|fiquei curiosa|[oó] que [eé]|nunca ouvi|interessante|sabia que/i.test(q) && !isLearning;
  const isDreamQuestion = rt === 'dream_analysis' || rt === 'interpretation' || /sonhei|sonh[oa]|pesadelo|interpreta/i.test(q);
  const isCelebration = mode === 'celebration' || /consegui|alcancei|realizei|cumpri|venci|superei|passei|estou feliz|fiquei feliz|conquista|vit[óo]ria|conquistei/i.test(q);
  const isFollowUp = /como (estou|vou|temos evoluído)|e a[ií]|e então|atualiza|continuamos|o que mudou|e agora|pr[óo]ximos passos/i.test(q) && !isFactualQuestion && !isVenting && !isAdviceSeeking;
  const isEmotional = rt === 'emotional' || rt === 'emotional_support' || (isVenting || /estou me sentindo|me sinto|ansios[oa]|triste|deprimid[oa]|angustiado|preocupad[oa]/i.test(q));

  let intent = 'chat';
  let confidence = 70;
  let urgency = 0;

  if (isGreeting || isFarewell || isShortAnswer) {
    intent = 'chat';
    confidence = 90;
    urgency = 0;
  } else if (isCelebration) {
    intent = 'celebrate';
    confidence = 85;
    urgency = 0;
  } else if (isVenting) {
    intent = 'vent';
    confidence = 80;
    urgency = Math.min(10, Math.max(3, Math.round(intensity / 10)));
  } else if (isDecisionHelp) {
    intent = 'decision_help';
    confidence = 75;
    urgency = 5;
  } else if (isAdviceSeeking) {
    intent = 'advice';
    confidence = 75;
    urgency = intensity >= 6 ? 6 : 3;
  } else if (isEmotional && !isVenting) {
    intent = 'emotional_support';
    confidence = 75;
    urgency = Math.min(10, Math.max(2, Math.round(intensity / 10)));
  } else if (isDreamQuestion) {
    intent = 'dream_interpretation';
    confidence = 85;
    urgency = 0;
  } else if (isReflection) {
    intent = 'reflect';
    confidence = 80;
    urgency = 0;
  } else if (isFollowUp) {
    intent = 'follow_up';
    confidence = 70;
    urgency = 2;
  } else if (isLearning) {
    intent = 'learn';
    confidence = 75;
    urgency = 0;
  } else if (isCuriosity) {
    intent = 'curious';
    confidence = 70;
    urgency = 0;
  } else if (isFactualQuestion) {
    intent = 'objective_answer';
    confidence = 85;
    urgency = 0;
  } else if (isExpressionOfNeed) {
    intent = 'advice';
    confidence = 60;
    urgency = 5;
  } else {
    intent = 'chat';
    confidence = 60;
    urgency = 0;
  }

  const requiresEmpathy = ['vent', 'emotional_support', 'decision_help', 'advice'].includes(intent) ||
    (intensity >= 5 && intent !== 'objective_answer');
  const requiresReflection = ['reflect', 'decision_help', 'advice', 'follow_up'].includes(intent);
  const requiresGuidance = ['advice', 'decision_help', 'learn'].includes(intent);
  const requiresAction = ['decision_help', 'advice'].includes(intent) && urgency >= 5;
  const requiresCelebration = intent === 'celebrate';
  const requiresMemoryRecall = ['follow_up', 'reflect', 'chat'].includes(intent) && wordCount > 3;
  const requiresDreamAnalysis = intent === 'dream_interpretation';
  const requiresFollowUp = ['vent', 'emotional_support', 'reflect', 'celebrate', 'follow_up'].includes(intent);
  const shouldBeShort = ['objective_answer', 'chat', 'curious'].includes(intent) && wordCount <= 4;
  const shouldBeDetailed = ['vent', 'emotional_support', 'advice', 'decision_help', 'reflect', 'learn'].includes(intent);

  return {
    intent,
    confidence,
    urgency,
    requiresEmpathy,
    requiresReflection,
    requiresGuidance,
    requiresAction,
    requiresCelebration,
    requiresMemoryRecall,
    requiresDreamAnalysis,
    requiresFollowUp,
    shouldBeShort,
    shouldBeDetailed,
  };
}

module.exports = { detectIntent };
