function extractTopics(question) {
  const q = (question || '').toLowerCase();
  const topics = [];

  const patterns = [
    { topic: 'sonhos', rx: /sonho|sonhei|pesadelo|sonhar|sonhando/ },
    { topic: 'emoções', rx: /emo[cç][ãa]o|sentimento|ansiedade|triste|feliz|medo|raiva|preocupa/ },
    { topic: 'saúde', rx: /sa[úu]de|bem-estar|bem estar|físico|exerc[ií]cio|alimenta/ },
    { topic: 'sono', rx: /sono|dormir|ins[ôo]nia|acordar|descanso/ },
    { topic: 'relacionamentos', rx: /relacionamento|fam[ií]lia|amigo|parceir[oa]|casamento|namoro/ },
    { topic: 'trabalho', rx: /trabalho|carreira|profissional|emprego|promo[cç][ãa]o/ },
    { topic: 'estudos', rx: /estudo|aprender|curso|faculdade|escola|conhecimento/ },
    { topic: 'objetivos', rx: /objetivo|meta|conquistar|realizar|alcançar/ },
    { topic: 'espiritualidade', rx: /espiritual|prop[óo]sito|significado|medita[cç][ãa]o|ora[cç][ãa]o/ },
    { topic: 'autoestima', rx: /autoestima|autoconfiança|insegurança|valoriza[cç][ãa]o/ },
    { topic: 'rotina', rx: /rotina|h[áa]bito|consistência|disciplina|organiza[cç][ãa]o/ },
    { topic: 'futuro', rx: /futuro|pr[óo]ximo|planejar|planos|pretendo/ },
    { topic: 'passado', rx: /passado|lembr|antes|antigamente|recordar/ },
    { topic: 'mudança', rx: /mudança|transforma|crescimento|evolução|melhorar/ },
  ];

  for (const p of patterns) {
    if (p.rx.test(q)) topics.push(p.topic);
  }

  return [...new Set(topics)];
}

function determineMainTopic(question, cognitiveContext) {
  const cc = cognitiveContext || {};
  const convCtx = cc.conversationContext || {};
  const planTopic = (convCtx.primaryTopic || '').toLowerCase();
  const detected = extractTopics(question);

  if (detected.length > 0) return detected[0];
  if (planTopic) return planTopic;
  if (cc.activeGoals && cc.activeGoals.length > 0) return 'objetivos';
  if (cc.activeNarrative && cc.activeNarrative.length > 0) return 'jornada';
  return 'geral';
}

function determineMainConcern(question, cognitiveContext, emotionalState) {
  const cc = cognitiveContext || {};
  const emotion = (emotionalState && emotionalState.detectedEmotion) || '';
  const concerns = [];

  if (cc.activeWarnings && cc.activeWarnings.length > 0) {
    concerns.push(cc.activeWarnings[0]);
  }

  if (cc.activeGoals) {
    const low = cc.activeGoals.filter(g => g.progress <= 30);
    if (low.length > 0) concerns.push('Baixo progresso em: ' + low[0].title);
  }

  if (cc.activeNarrative) {
    const neg = cc.activeNarrative.filter(n => n.category === 'emoções' || n.category === 'comportamento');
    if (neg.length > 0) concerns.push(neg[0].summary);
  }

  if (cc.activeJourneys) {
    const stalled = cc.activeJourneys.filter(j => j.progress <= 30);
    if (stalled.length > 0) concerns.push('Jornada estagnada: ' + stalled[0].title);
  }

  if (emotion && ['tristeza', 'ansiedade', 'medo', 'frustração', 'raiva'].includes(emotion)) {
    concerns.push('Estado emocional: ' + emotion);
  }

  return concerns.length > 0 ? concerns[0] : null;
}

function determineMainOpportunity(question, cognitiveContext) {
  const cc = cognitiveContext || {};
  const opportunities = [];

  if (cc.activeGoals) {
    const high = cc.activeGoals.filter(g => g.progress >= 70);
    if (high.length > 0) opportunities.push('Progresso significativo em: ' + high[0].title);
  }

  if (cc.activeNarrative) {
    const pos = cc.activeNarrative.filter(n => n.category === 'conquistas' || n.category === 'objetivos');
    if (pos.length > 0) opportunities.push(pos[0].summary);
  }

  if (cc.activePatterns && cc.activePatterns.lifeInsights) {
    const li = cc.activePatterns.lifeInsights;
    if (li.strengths && li.strengths.length > 0) opportunities.push('Ponto forte: ' + li.strengths[0]);
  }

  if (cc.activeJourneys) {
    const adv = cc.activeJourneys.filter(j => j.progress >= 60);
    if (adv.length > 0) opportunities.push('Jornada avançada: ' + adv[0].title);
  }

  if (cc.activeQuality && cc.activeQuality.averageConversationScore >= 70) {
    opportunities.push('Engajamento positivo');
  }

  return opportunities.length > 0 ? opportunities[0] : null;
}

function determineBestInsight(cognitiveContext) {
  const cc = cognitiveContext || {};
  const insights = cc.activeInsights || [];
  if (insights.length === 0) return null;

  const prioritized = [...insights].sort((a, b) => {
    const pa = a.priority === 'critical' ? 3 : a.priority === 'high' ? 2 : a.priority === 'medium' ? 1 : 0;
    const pb = b.priority === 'critical' ? 3 : b.priority === 'high' ? 2 : b.priority === 'medium' ? 1 : 0;
    return pb - pa;
  });

  return prioritized[0];
}

function determineReasoning(question, cognitiveContext, decisions, strategy, emotionalState, mainTopic, mainConcern, mainOpportunity) {
  const d = decisions || {};
  const s = strategy || {};
  const emotion = (emotionalState && emotionalState.detectedEmotion) || '';
  const mode = (emotionalState && emotionalState.conversationMode) || '';
  const rt = (cognitiveContext && cognitiveContext.conversationContext && cognitiveContext.conversationContext.responseType) || '';

  const isFactual = rt === 'factual_question' || rt === 'objective';
  const isEmotional = rt === 'emotional' || rt === 'personal' || mode === 'support' || mode === 'crisis';
  const isCelebration = mode === 'celebration' || s.strategy === 'answer_and_celebrate';
  const isEvolution = rt === 'evolution' || rt === 'comparison' || s.strategy === 'answer_and_reflect';
  const isDreamAnalysis = rt === 'dream_analysis';
  const isGoalRelated = s.strategy === 'answer_and_goal' || (mainTopic === 'objetivos');
  const isGreeting = rt === '' && !mainConcern && !mainOpportunity;

  const topics = extractTopics(question);
  const hasChangeTopics = topics.some(t => ['mudança', 'futuro', 'rotina', 'objetivos', 'autoestima'].includes(t));

  if (isFactual || d.reason === 'factual' || d.reason === 'factual_short') {
    return {
      line: 'objective',
      description: 'Responder de forma objetiva e direta, sem conexões contextuais extras.',
      strategy: 'factual',
    };
  }

  if (isCelebration) {
    return {
      line: 'celebratory',
      description: 'Validar a conquista, celebrar com o usuário e incentivar continuidade.',
      strategy: 'celebratory',
    };
  }

  if (isEmotional || d.reason === 'emotional') {
    return {
      line: 'empathic',
      description: 'Priorizar acolhimento emocional, validar sentimentos, explorar com sensibilidade.',
      strategy: 'supportive',
    };
  }

  if (isDreamAnalysis) {
    return {
      line: 'exploratory',
      description: 'Explorar o sonho com curiosidade, conectar a padrões emocionais e oferecer perspectivas.',
      strategy: 'reflective',
    };
  }

  if (isEvolution) {
    return {
      line: 'evolutionary',
      description: 'Mostrar a evolução do usuário ao longo do tempo, conectar eventos passados com o momento atual.',
      strategy: 'connective',
    };
  }

  if (isGoalRelated || hasChangeTopics) {
    return {
      line: 'strategic',
      description: 'Focar em objetivos, progresso e próximos passos. Incentivar consistência.',
      strategy: 'motivational',
    };
  }

  if (mainConcern && !mainOpportunity) {
    return {
      line: 'supportive',
      description: 'Endereçar a preocupação identificada com acolhimento e orientação prática.',
      strategy: 'supportive',
    };
  }

  if (mainOpportunity) {
    return {
      line: 'encouraging',
      description: 'Reforçar o aspecto positivo identificado e inspirar continuidade.',
      strategy: 'motivational',
    };
  }

  if (isGreeting || d.reason === 'greeting_or_general') {
    return {
      line: 'conversational',
      description: 'Responder ao cumprimento de forma natural e acolhedora, sem profundidade.',
      strategy: 'casual',
    };
  }

  return {
    line: 'balanced',
    description: 'Responder de forma natural, integrando informações do contexto com equilíbrio.',
    strategy: 'balanced',
  };
}

function determinePriority(emotionalState, mainConcern, decisions, cognitiveContext) {
  const emotion = (emotionalState && emotionalState.detectedEmotion) || '';
  const intensity = (emotionalState && emotionalState.emotionalIntensity) || 0;
  const mode = (emotionalState && emotionalState.conversationMode) || '';
  const cc = cognitiveContext || {};

  if (mode === 'crisis') return { level: 'critical', reason: 'Crise emocional detectada' };
  if (intensity >= 8) return { level: 'high', reason: 'Alta intensidade emocional' };
  if (mode === 'support' && emotion) return { level: 'high', reason: 'Necessidade de suporte emocional' };
  if (mainConcern) return { level: 'medium', reason: 'Preocupação identificada' };
  if (cc.activeWarnings && cc.activeWarnings.length > 0) return { level: 'medium', reason: 'Alertas ativos' };
  if (decisions && decisions.reason === 'factual') return { level: 'low', reason: 'Pergunta factual' };

  return { level: 'normal', reason: 'Fluxo normal de conversa' };
}

function determineRecommendedFocus(mainTopic, mainConcern, mainOpportunity, reasoning) {
  const rl = (reasoning && reasoning.line) || '';

  if (rl === 'objective' || rl === 'factual') return 'responder à pergunta com precisão';
  if (rl === 'celebratory') return 'celebrar a conquista e incentivar próximos passos';
  if (rl === 'empathic') return 'acolher a emoção e explorar com sensibilidade';
  if (rl === 'exploratory') return 'explorar o tema com curiosidade e conectar a padrões';
  if (rl === 'evolutionary') return 'conectar eventos passados e mostrar evolução';
  if (rl === 'strategic') return 'foco em objetivos e progresso';
  if (rl === 'supportive' && mainConcern) return 'abordar a preocupação com acolhimento';
  if (rl === 'encouraging' && mainOpportunity) return 'reforçar o aspecto positivo';

  return 'responder de forma natural e equilibrada';
}

function determineIgnoredContexts(decisions, reasoning) {
  const d = decisions || {};
  const ignored = [];

  if (!d.useMemoryFacts) ignored.push('memoryFacts');
  if (!d.useConversationMemory) ignored.push('conversationMemory');
  if (!d.useProactiveInsights) ignored.push('proactiveInsights');
  if (!d.useRecentDreams) ignored.push('recentDreams');
  if (!d.useRecentEmotions) ignored.push('recentEmotions');
  if (!d.useTimeline) ignored.push('timeline');
  if (!d.useDreamCoach) ignored.push('dreamCoach');
  if (!d.useLifeInsights) ignored.push('lifeInsights');

  const rl = (reasoning && reasoning.line) || '';
  if (rl === 'factual' || rl === 'objective') {
    if (!ignored.includes('narrativeContinuity')) ignored.push('narrativeContinuity');
    if (!ignored.includes('journeys')) ignored.push('journeys');
  }

  return ignored;
}

function reason({ question, cognitiveContext, decisions, strategy, emotionalState, journeys, narrative, relationships, proactiveInsights } = {}) {
  const mainTopic = determineMainTopic(question, cognitiveContext);
  const mainConcern = determineMainConcern(question, cognitiveContext, emotionalState);
  const mainOpportunity = determineMainOpportunity(question, cognitiveContext);
  const bestInsight = determineBestInsight(cognitiveContext);
  const reasoning = determineReasoning(question, cognitiveContext, decisions, strategy, emotionalState, mainTopic, mainConcern, mainOpportunity);
  const priority = determinePriority(emotionalState, mainConcern, decisions, cognitiveContext);
  const recommendedFocus = determineRecommendedFocus(mainTopic, mainConcern, mainOpportunity, reasoning);
  const ignoredContexts = determineIgnoredContexts(decisions, reasoning);

  return {
    mainTopic,
    mainConcern,
    mainOpportunity,
    bestInsight,
    reasoning,
    priority,
    recommendedFocus,
    ignoredContexts,
  };
}

module.exports = { reason };
