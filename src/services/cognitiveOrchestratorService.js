function orchestrate(question, decisions, plan, emotionalState, adaptiveProfile, context) {
  const q = (question || '').toLowerCase();
  const rt = (plan && plan.responseType) || '';
  const pt = (plan && plan.primaryTopic) || '';
  const mode = (emotionalState && emotionalState.conversationMode) || '';

  const d = decisions || {};
  const profile = adaptiveProfile || {};

  const isFactual = rt === 'factual_question' || rt === 'objective';
  const isEmotional = rt === 'emotional' || rt === 'personal';
  const isEvolution = rt === 'evolution' || rt === 'comparison';
  const isDreamAnalysis = rt === 'dream_analysis' || /sonho|sonhei|pesadelo|significa sonhar/i.test(q);
  const isGreeting = /^(oi|ol[áa]|tudo bem|bom dia|boa tarde|boa noite)/i.test(q) && q.split(/\s+/).length <= 4;
  const hasTechnicalPattern = /como (?:fazer|criar|instalar|configurar)/i.test(q) && !isDreamAnalysis;

  const hasActiveGoals = (context && context.activeGoals && context.activeGoals.length > 0);
  const hasConvMemories = (context && context.conversationMemories && context.conversationMemories.length > 0);
  const hasDreamData = (context && ((context.predominantCategories && context.predominantCategories.length > 0) || (context.recurrentSymbols && context.recurrentSymbols.length > 0)));
  const hasFacts = (context && context.longTermMemory && context.longTermMemory.length > 0);
  const hasInsights = (context && context.proactiveInsights && context.proactiveInsights.length > 0);
  const hasTimeline = (context && context.timeline && context.timeline.length > 0);
  const hasDreamCoach = (context && context.dreamCoach !== null);
  const hasLifeInsights = (context && context.lifeInsights !== null);

  const scores = {};

  if (isGreeting || (hasTechnicalPattern && !isDreamAnalysis)) {
    scores.memoryFacts = 0;
    scores.conversationMemory = 0;
    scores.dreamCoach = 0;
    scores.lifeInsights = 0;
    scores.timeline = 0;
    scores.goalTracking = 0;
    scores.proactiveInsights = 0;
    scores.recentDreams = 0;
    scores.recentEmotions = 0;
    return buildResult(scores, 'greeting_or_technical');
  }

  if (isFactual) {
    scores.memoryFacts = hasFacts ? 30 : 0;
    scores.conversationMemory = 0;
    scores.dreamCoach = 0;
    scores.lifeInsights = 0;
    scores.timeline = 0;
    scores.goalTracking = 0;
    scores.proactiveInsights = 0;
    scores.recentDreams = 0;
    scores.recentEmotions = 0;
    return buildResult(scores, 'factual_question');
  }

  if (isEvolution) {
    scores.memoryFacts = hasFacts ? 70 : 0;
    scores.conversationMemory = hasConvMemories ? 40 : 0;
    scores.dreamCoach = hasDreamCoach ? 90 : 0;
    scores.lifeInsights = hasLifeInsights ? 95 : 0;
    scores.timeline = hasTimeline ? 85 : 0;
    scores.goalTracking = hasActiveGoals ? 80 : 0;
    scores.proactiveInsights = hasInsights ? 60 : 0;
    scores.recentDreams = hasDreamData ? 50 : 0;
    scores.recentEmotions = 40;
    return buildResult(scores, 'evolution');
  }

  if (isDreamAnalysis) {
    scores.memoryFacts = hasFacts ? 85 : 0;
    scores.conversationMemory = 0;
    scores.dreamCoach = hasDreamCoach ? 90 : 0;
    scores.lifeInsights = 0;
    scores.timeline = 0;
    scores.goalTracking = 0;
    scores.proactiveInsights = 0;
    scores.recentDreams = hasDreamData ? 95 : 70;
    scores.recentEmotions = hasFacts ? 50 : 0;
    return buildResult(scores, 'dream_analysis');
  }

  if (isEmotional) {
    scores.memoryFacts = hasFacts ? 85 : 0;
    scores.conversationMemory = hasConvMemories ? 60 : 0;
    scores.dreamCoach = hasDreamCoach ? 90 : 0;
    scores.lifeInsights = hasLifeInsights ? 70 : 0;
    scores.timeline = 0;
    scores.goalTracking = hasActiveGoals ? 75 : 0;
    scores.proactiveInsights = hasInsights ? 80 : 0;
    scores.recentDreams = hasDreamData && mode !== 'support' ? 40 : 0;
    scores.recentEmotions = 65;
    return buildResult(scores, 'emotional');
  }

  scores.memoryFacts = hasFacts ? 50 : 0;
  scores.conversationMemory = hasConvMemories ? 40 : 0;
  scores.dreamCoach = hasDreamCoach ? 30 : 0;
  scores.lifeInsights = hasLifeInsights ? 20 : 0;
  scores.timeline = hasTimeline ? 20 : 0;
  scores.goalTracking = hasActiveGoals ? 40 : 0;
  scores.proactiveInsights = hasInsights ? 20 : 0;
  scores.recentDreams = hasDreamData ? 30 : 0;
  scores.recentEmotions = 0;
  return buildResult(scores, 'default');
}

function buildResult(scores, reason) {
  const modules = {};
  const activeModules = [];
  const ignoredModules = [];

  for (const [key, score] of Object.entries(scores)) {
    const use = score > 0;
    modules[key] = { use, priority: score, reason: use ? 'active' : 'ignored' };
    if (use) {
      activeModules.push(key);
    } else {
      ignoredModules.push(key);
    }
  }

  activeModules.sort((a, b) => scores[b] - scores[a]);

  const exceeded = activeModules.length > 3;
  while (activeModules.length > 3) {
    const removed = activeModules.pop();
    modules[removed] = { use: false, priority: 0, reason: 'limit_3_modules' };
    ignoredModules.push(removed);
  }

  return {
    modules,
    activeModules,
    ignoredModules,
    maxReached: exceeded,
    reason,
  };
}

module.exports = { orchestrate };
