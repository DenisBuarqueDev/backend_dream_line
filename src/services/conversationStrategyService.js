function evaluate(question, context, adaptiveProfile, emotionalState, plan, decisions, initiative) {
  const q = (question || '').toLowerCase();
  const rt = (plan && plan.responseType) || '';
  const pt = (plan && plan.primaryTopic) || '';
  const mode = (emotionalState && emotionalState.conversationMode) || '';
  const emotion = (emotionalState && emotionalState.detectedEmotion) || '';

  const profile = adaptiveProfile || {};
  const d = decisions || {};

  const hasGoal = (context && context.activeGoals && context.activeGoals.length > 0);
  const hasConversationMemory = (context && context.conversationMemories && context.conversationMemories.length > 0);
  const hasMemories = (context && context.longTermMemory && context.longTermMemory.length > 0);
  const hasInsights = (context && context.proactiveInsights && context.proactiveInsights.length > 0);
  const hasDreamData = (context && ((context.predominantCategories && context.predominantCategories.length > 0) || (context.recurrentSymbols && context.recurrentSymbols.length > 0)));
  const hasInitiative = (initiative && initiative.shouldSuggest && initiative.suggestion);

  const isShortQuestion = q.split(/\s+/).filter(Boolean).length <= 4;
  const isGreeting = /^(oi|ol[áa]|tudo bem|bom dia|boa tarde|boa noite)/i.test(q) && isShortQuestion;
  const isTechnical = /como (?:fazer|criar|instalar|configurar)/i.test(q) && !/sonho|emo[cç][ãa]o|ansiedade/i.test(q);
  const isFactual = rt === 'factual_question' || rt === 'objective';
  const isEmotional = rt === 'emotional' || rt === 'personal';
  const isDreamAnalysis = rt === 'dream_analysis' || /sonho|sonhei|pesadelo|significa sonhar/i.test(q);
  const isEvolution = rt === 'evolution' || rt === 'comparison';

  const isAchievement = /consegui|alcancei|realizei|cumpri|completei|venci|superei/i.test(q);
  const isStruggling = /dif[ií]cil|complicado|n[aã]o t[oô] conseguindo|t[oô] com dificuldade|cansad[ao]|dificuldade/i.test(q);
  const isReflective = /o que (?:voc[êe] acha|acha que|pensa)|por que (?:isso acontece|me sinto)|qual (?:o sentido|a raz[aã]o)/i.test(q);
  const isGoalRelated = /objetivo|meta|quero|pretendo|meu foco/i.test(q);

  let strategy = 'answer_only';
  let shouldAskFollowUp = false;
  let followUpType = 'curiosidade';
  let depth = 'média';
  let curiosity = false;
  let shouldClose = false;

  if (isGreeting || (isTechnical && !isDreamAnalysis)) {
    strategy = 'answer_only';
    shouldAskFollowUp = false;
    depth = 'superficial';
    curiosity = false;
    shouldClose = false;
  } else if (isFactual) {
    strategy = 'answer_only';
    shouldAskFollowUp = false;
    depth = 'superficial';
    curiosity = false;
    shouldClose = true;
  } else if (isAchievement) {
    strategy = 'answer_and_celebrate';
    shouldAskFollowUp = true;
    followUpType = 'reflexão';
    depth = 'média';
    curiosity = true;
    shouldClose = false;
  } else if (isEmotional && isStruggling && hasGoal) {
    strategy = 'answer_and_goal';
    shouldAskFollowUp = true;
    followUpType = 'objetivo';
    depth = 'média';
    curiosity = true;
    shouldClose = false;
  } else if (isEmotional && isStruggling) {
    strategy = 'answer_and_encourage';
    shouldAskFollowUp = true;
    followUpType = 'emocional';
    depth = 'profunda';
    curiosity = true;
    shouldClose = false;
  } else if (isEmotional) {
    strategy = 'answer_and_explore';
    shouldAskFollowUp = true;
    followUpType = 'emocional';
    depth = 'média';
    curiosity = true;
    shouldClose = false;
  } else if (isDreamAnalysis && hasDreamData) {
    strategy = 'answer_and_reflect';
    shouldAskFollowUp = true;
    followUpType = 'sonho';
    depth = 'profunda';
    curiosity = true;
    shouldClose = false;
  } else if (isDreamAnalysis) {
    strategy = 'answer_and_explore';
    shouldAskFollowUp = true;
    followUpType = 'sonho';
    depth = 'média';
    curiosity = false;
    shouldClose = false;
  } else if (isEvolution) {
    strategy = 'answer_and_reflect';
    shouldAskFollowUp = true;
    followUpType = 'reflexão';
    depth = 'profunda';
    curiosity = true;
    shouldClose = false;
  } else if (hasInitiative) {
    strategy = 'answer_and_remember';
    shouldAskFollowUp = true;
    followUpType = 'curiosidade';
    depth = 'média';
    curiosity = true;
    shouldClose = false;
  } else if (isGoalRelated && hasGoal) {
    strategy = 'answer_and_goal';
    shouldAskFollowUp = true;
    followUpType = 'objetivo';
    depth = 'média';
    curiosity = true;
    shouldClose = false;
  } else if (isReflective) {
    strategy = 'answer_and_reflect';
    shouldAskFollowUp = true;
    followUpType = 'reflexão';
    depth = 'profunda';
    curiosity = true;
    shouldClose = false;
  } else if (hasConversationMemory) {
    strategy = 'answer_and_remember';
    shouldAskFollowUp = true;
    followUpType = 'curiosidade';
    depth = 'média';
    curiosity = true;
    shouldClose = false;
  } else {
    strategy = 'answer_only';
    shouldAskFollowUp = false;
    depth = 'média';
    curiosity = false;
    shouldClose = false;
  }

  if (profile.preferredConversationLength === 'short' || profile.preferredEmpathyLevel === 'low') {
    if (shouldAskFollowUp && strategy !== 'answer_and_celebrate') {
      shouldAskFollowUp = false;
      depth = 'superficial';
      curiosity = false;
    }
  }

  if (profile.preferredConversationLength === 'long' && !shouldAskFollowUp && !isFactual && !isGreeting) {
    shouldAskFollowUp = true;
    followUpType = 'curiosidade';
    depth = 'profunda';
    curiosity = true;
  }

  if (d.shouldAskFollowUp === false) {
    shouldAskFollowUp = false;
  }

  if (d.maxConnections === 0 && !isFactual && !isGreeting) {
    if (strategy === 'answer_only' && !shouldAskFollowUp && !isFactual) {
      shouldClose = true;
    }
  }

  return {
    strategy,
    shouldAskFollowUp,
    followUpType,
    depth,
    curiosity,
    shouldClose,
  };
}

module.exports = { evaluate };
