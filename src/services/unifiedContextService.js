const MAX_TOKENS = 1200;
const HARD_LIMIT = 1500;

function estimateTokens(obj) {
  return Math.ceil(JSON.stringify(obj).length / 4);
}

function truncateAtWord(text, maxLen) {
  if (!text || text.length <= maxLen) return text || '';
  const truncated = text.substring(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

function buildPersonalContext(context) {
  return {
    profile: context.profile || null,
    dreamScore: context.dreamScore || null,
    stats: context.summary || null,
    sleepStats: context.sleepStats || null,
    emotionStats: context.emotionStats ? {
      predominant: context.emotionStats.predominant,
      averageIntensity: context.emotionStats.averageIntensity,
    } : null,
    dreamStats: context.dreamStats ? {
      mostFrequentCategory: context.dreamStats.mostFrequentCategory,
      categories: (context.dreamStats.categories || []).slice(0, 3),
    } : null,
  };
}

function buildActiveMemories(context, plan) {
  if (!plan || !plan.shouldUseMemoryFacts) return [];
  const facts = context.longTermMemory || [];
  return facts.slice(0, 2).map(f => ({
    category: f.category,
    fact: typeof f.fact === 'string' ? truncateAtWord(f.fact, 120) : f.fact,
  }));
}

function buildActiveInsights(context, plan) {
  if (!plan) return [];
  const insights = context.proactiveInsights || [];

  if (plan.responseType === 'factual_question' || plan.responseType === 'objective') return [];

  if (plan.responseType === 'comparison' || plan.responseType === 'evolution' || plan.shouldUseDreamCoach || plan.shouldUseLifeInsights) {
    return insights.slice(0, 3).map(i => ({
      title: i.title,
      description: typeof i.description === 'string' ? truncateAtWord(i.description, 100) : i.description,
      priority: i.priority,
    }));
  }

  return insights.slice(0, 2).map(i => ({
    title: i.title,
    description: typeof i.description === 'string' ? truncateAtWord(i.description, 100) : i.description,
    priority: i.priority,
  }));
}

function buildActiveTimeline(context, plan) {
  if (!plan || !plan.shouldUseTimeline) return [];
  const timeline = context.timeline || [];
  return timeline.slice(0, 3).map(e => ({
    date: e.date,
    type: e.type,
    title: e.title,
    category: e.category,
  }));
}

function buildActivePatterns(context, plan) {
  const patterns = {};

  if (plan && plan.shouldUseRecentDreams) {
    const cats = context.predominantCategories || [];
    if (cats.length > 0) {
      patterns.categories = cats.slice(0, 3);
    }
    const symbols = context.recurrentSymbols || [];
    if (symbols.length > 0) {
      patterns.symbols = symbols.slice(0, 3).map(s => s.symbol || s);
    }
    const tags = context.predominantTags || [];
    if (tags.length > 0) {
      patterns.tags = tags.slice(0, 3).map(t => t.name || t);
    }
  }

  if (context.correlations && context.correlations.strongestCorrelations && context.correlations.strongestCorrelations.length > 0) {
    patterns.correlations = context.correlations.strongestCorrelations.slice(0, 2);
  }

  const coach = context.dreamCoach;
  if (coach && plan && plan.shouldUseDreamCoach) {
    patterns.dreamCoach = {
      overallStatus: coach.overallStatus,
      evolution: (coach.evolution || []).slice(0, 2),
    };
  }

  const insights = context.lifeInsights;
  if (insights && plan && plan.shouldUseLifeInsights) {
    patterns.lifeInsights = {};
    if (insights.strengths && insights.strengths.length > 0) {
      patterns.lifeInsights.strengths = insights.strengths.slice(0, 2);
    }
    if (insights.habits && insights.habits.length > 0) {
      patterns.lifeInsights.habits = insights.habits.slice(0, 2);
    }
    if (insights.emotionalEvolution && insights.emotionalEvolution.length > 0) {
      patterns.lifeInsights.emotionalEvolution = insights.emotionalEvolution.slice(0, 1);
    }
    if (insights.sleepEvolution && insights.sleepEvolution.length > 0) {
      patterns.lifeInsights.sleepEvolution = insights.sleepEvolution.slice(0, 1);
    }
  }

  return patterns;
}

function buildActiveRecommendations(context) {
  return (context.recommendations || []).slice(0, 2);
}

function buildActiveWarnings(context) {
  return (context.warnings || []).slice(0, 2);
}

function buildActiveConversations(context) {
  const mems = context.conversationMemories || [];
  return mems.slice(0, 5).map(m => ({
    topic: m.topic,
    summary: typeof m.summary === 'string' ? truncateAtWord(m.summary, 100) : m.summary,
    status: m.status,
  }));
}

function buildEmotionalContext(emotionalState) {
  if (!emotionalState) return null;
  return {
    detectedEmotion: emotionalState.detectedEmotion,
    intensity: emotionalState.emotionalIntensity,
    mode: emotionalState.conversationMode,
    empathyLevel: emotionalState.empathyLevel,
    avoidAnalysis: emotionalState.shouldAvoidAnalysis || false,
    beObjective: emotionalState.shouldBeObjective || false,
  };
}

function buildActiveGoals(context) {
  const goals = context.activeGoals || [];
  return goals.slice(0, 3).map(g => ({
    title: g.title,
    category: g.category,
    progress: g.progress,
    importance: g.importance,
  }));
}

function buildQualitySummary(context) {
  const q = context.qualitySummary;
  if (!q) return null;
  return {
    averageConversationScore: q.averageConversationScore,
    averageEngagement: q.averageEngagement,
    averageFollowUp: q.averageFollowUp,
    preferredConversationDepth: q.preferredConversationDepth,
    preferredContextLevel: q.preferredContextLevel,
    preferredInitiativeLevel: q.preferredInitiativeLevel,
  };
}

function label(value, low, mid) {
  if (value == null) return 'Médio';
  if (value <= low) return 'Baixo';
  if (value <= mid) return 'Médio';
  return 'Alto';
}

function energyLabel(value) {
  if (value == null) return 'Moderada';
  if (value <= 35) return 'Baixa';
  if (value <= 65) return 'Moderada';
  return 'Alta';
}

function buildActiveJourneys(context) {
  const journeys = context.activeJourneys || [];
  return journeys.slice(0, 5).map(j => ({
    title: j.title,
    category: j.category,
    progress: j.progress,
    importance: j.importance,
    currentStage: j.currentStage,
    lastInteraction: j.lastInteraction,
    updatedAt: j.updatedAt,
  }));
}

function buildActiveNarrative(context) {
  const narr = context.continuousNarrative;
  if (!narr || narr.length === 0) return [];
  return narr.slice(0, 5).map(n => ({
    summary: n.summary,
    confidence: n.confidence,
    category: n.category,
    importance: n.importance,
  }));
}

function buildActiveRelationships(context) {
  const rels = context.importantRelationships || [];
  return rels.slice(0, 5).map(r => ({
    name: r.name,
    relationship: r.relationship,
    emotionalWeight: r.emotionalWeight,
    importance: r.importance,
    currentStatus: r.currentStatus || '',
    mentionCount: r.mentionCount || 0,
    lastMention: r.lastMention,
  }));
}

function buildActivePersonality(context) {
  const p = context.personalityProfile;
  if (!p) return null;
  return {
    warmth: label(p.warmth, 35, 65),
    empathy: label(p.empathy, 35, 65),
    curiosity: label(p.curiosity, 35, 65),
    humor: label(p.humor, 25, 50),
    optimism: label(p.optimism, 35, 65),
    directness: label(p.directness, 35, 65),
    playfulness: label(p.playfulness, 25, 50),
    reflectionLevel: label(p.reflectionLevel, 35, 65),
    conversationEnergy: energyLabel(p.conversationEnergy),
  };
}

function deduplicate(cognitiveContext) {
  const seen = new Set();

  if (cognitiveContext.activeMemories && cognitiveContext.activeMemories.length > 0) {
    for (const m of cognitiveContext.activeMemories) {
      const key = `mem:${m.category}:${m.fact}`;
      seen.add(key);
    }
  }

  if (cognitiveContext.activeInsights && cognitiveContext.activeInsights.length > 0) {
    cognitiveContext.activeInsights = cognitiveContext.activeInsights.filter(i => {
      const key = `insight:${i.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (cognitiveContext.activePatterns && cognitiveContext.activePatterns.lifeInsights) {
    const li = cognitiveContext.activePatterns.lifeInsights;
    if (li.habits && li.habits.length > 0) {
      li.habits = li.habits.filter(h => {
        const key = `habit:${h}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }

  if (cognitiveContext.activeRecommendations && cognitiveContext.activeWarnings) {
    const warnSet = new Set((cognitiveContext.activeWarnings || []).map(w => w.toLowerCase()));
    cognitiveContext.activeRecommendations = cognitiveContext.activeRecommendations.filter(
      r => !warnSet.has(r.title.toLowerCase())
    );
  }

  return cognitiveContext;
}

function enforceTokenBudget(cognitiveContext) {
  let tokens = estimateTokens(cognitiveContext);
  if (tokens <= MAX_TOKENS) return cognitiveContext;

  const reductions = [
    () => { if (cognitiveContext.activeGoals) cognitiveContext.activeGoals = []; },
    () => { if (cognitiveContext.activeInitiative) cognitiveContext.activeInitiative = null; },
    () => { if (cognitiveContext.activeConversations) cognitiveContext.activeConversations = []; },
    () => { if (cognitiveContext.activeWarnings) cognitiveContext.activeWarnings = []; },
    () => { if (cognitiveContext.activeRecommendations) cognitiveContext.activeRecommendations = []; },
    () => { if (cognitiveContext.activeTimeline) cognitiveContext.activeTimeline = []; },
    () => { if (cognitiveContext.activeInsights) cognitiveContext.activeInsights = []; },
    () => { if (cognitiveContext.activeMemories) cognitiveContext.activeMemories = []; },
    () => { if (cognitiveContext.activePatterns) { cognitiveContext.activePatterns = {}; } },
    () => { if (cognitiveContext.emotionalContext) cognitiveContext.emotionalContext = null; },
    () => { if (cognitiveContext.personalContext) {
      cognitiveContext.personalContext = { profile: cognitiveContext.personalContext.profile, dreamScore: cognitiveContext.personalContext.dreamScore };
    }},
  ];

  for (const reduce of reductions) {
    if (tokens <= HARD_LIMIT) break;
    reduce();
    tokens = estimateTokens(cognitiveContext);
  }

  return cognitiveContext;
}

function buildInitiative(initiative) {
  if (!initiative || !initiative.shouldSuggest || !initiative.suggestion) return null;
  return {
    suggestion: truncateAtWord(initiative.suggestion, 200),
    priority: initiative.priority || 'low',
  };
}

function build(context, plan, emotionalState, initiative, decisions, orchestration) {
  const d = decisions || {};
  const o = orchestration || {};

  const shouldUse = (key) => {
    if (o.modules && o.modules[key] !== undefined) {
      return o.modules[key].use !== false;
    }
    return true;
  };

  const activeMemories = (d.useMemoryFacts !== false && shouldUse('memoryFacts')) ? buildActiveMemories(context, plan) : [];
  const activeInsights = (d.useProactiveInsights !== false && shouldUse('proactiveInsights')) ? buildActiveInsights(context, plan) : [];
  const activeTimeline = (d.useTimeline !== false && shouldUse('timeline')) ? buildActiveTimeline(context, plan) : [];
  const activePatterns = {};

  if ((d.useRecentDreams !== false || d.useDreamCoach !== false || d.useLifeInsights !== false) &&
      (shouldUse('recentDreams') || shouldUse('dreamCoach') || shouldUse('lifeInsights'))) {
    Object.assign(activePatterns, buildActivePatterns(context, {
      ...plan,
      shouldUseRecentDreams: d.useRecentDreams !== false && shouldUse('recentDreams') ? (plan && plan.shouldUseRecentDreams) : false,
      shouldUseDreamCoach: d.useDreamCoach !== false && shouldUse('dreamCoach') ? (plan && plan.shouldUseDreamCoach) : false,
      shouldUseLifeInsights: d.useLifeInsights !== false && shouldUse('lifeInsights') ? (plan && plan.shouldUseLifeInsights) : false,
    }));
  }

  let cognitiveContext = {
    personalContext: (d.useUserMemory !== false) ? buildPersonalContext(context) : null,
    activeMemories,
    activeInsights,
    activeTimeline,
    activePatterns,
    activeRecommendations: (d.useUserMemory !== false) ? buildActiveRecommendations(context) : [],
    activeWarnings: (d.useUserMemory !== false) ? buildActiveWarnings(context) : [],
    activeConversations: (d.useConversationMemory !== false && shouldUse('conversationMemory')) ? buildActiveConversations(context) : [],
    activeGoals: (shouldUse('goalTracking')) ? buildActiveGoals(context) : [],
    activeQuality: buildQualitySummary(context),
    activePersonality: buildActivePersonality(context),
    activeRelationships: buildActiveRelationships(context),
    activeNarrative: buildActiveNarrative(context),
    activeJourneys: buildActiveJourneys(context),
    activeInitiative: (d.allowInitiative !== false) ? buildInitiative(initiative) : null,
    emotionalContext: buildEmotionalContext(emotionalState),
    conversationContext: plan ? {
      responseType: plan.responseType,
      primaryTopic: plan.primaryTopic,
      secondaryTopic: plan.secondaryTopic || null,
      answerStyle: plan.answerStyle,
      emotionalTone: plan.emotionalTone,
    } : null,
  };

  cognitiveContext = deduplicate(cognitiveContext);
  cognitiveContext = enforceTokenBudget(cognitiveContext);

  return cognitiveContext;
}

module.exports = { build };
