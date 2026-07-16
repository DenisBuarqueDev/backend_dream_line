const mongoose = require('mongoose');
const Dream = require('../models/Dream');
const EmotionJournal = require('../models/EmotionJournal');
const ChatMessage = require('../models/ChatMessage');
const deepseekService = require('./ai/deepseekService');
const memoryService = require('./memoryService');
const memoryExtraction = require('./memoryExtractionService');
const dreamCoach = require('./dreamCoachService');
const timelineService = require('./timelineService');
const lifeInsightsService = require('./lifeInsightsService');
const { buildChatPrompt } = require('./ai/chatPromptBuilder');
const { selectContext } = require('./contextSelectionService');
const { classifyResponse } = require('./responsePlanningService');
const emotionalIntelligence = require('./emotionalIntelligenceService');
const unifiedContext = require('./unifiedContextService');
const cognitiveEvaluation = require('./cognitiveEvaluationService');
const reflectionService = require('./reflectionService');
const proactiveInsightService = require('./proactiveInsightService');
const conversationMemory = require('./conversationMemoryService');
const conversationalInitiative = require('./conversationalInitiativeService');
const selfReflection = require('./selfReflectionService');
const adaptiveLearning = require('./adaptiveLearningService');
const cognitiveDecision = require('./cognitiveDecisionService');
const goalTracking = require('./goalTrackingService');
const conversationStrategy = require('./conversationStrategyService');
const cognitiveOrchestrator = require('./cognitiveOrchestratorService');
const cognitiveQuality = require('./cognitiveQualityService');
const personalityEngine = require('./personalityEngineService');
const relationshipMemory = require('./relationshipMemoryService');
const narrativeContinuity = require('./narrativeContinuityService');
const longTermCompanion = require('./longTermCompanionService');
const cognitiveReasoning = require('./cognitiveReasoningService');
const conversationPlanning = require('./conversationPlanningService');
const responseOptimization = require('./responseOptimizationService');
const conversationIntent = require('./conversationIntentService');
const responseGoal = require('./responseGoalService');
const { AI_PROVIDERS } = require('../config/aiProviders');

const MAX_CONTEXT_TOKENS = 3500;
const HISTORY_LIMIT = 5;
const DREAM_LIMIT = 5;
const EMOTION_LIMIT = 5;
const DREAM_SUMMARY_LENGTH = 200;
const INTERPRETATION_SUMMARY_LENGTH = 150;
const EMOTION_SUMMARY_LENGTH = 100;

function truncateAtWord(text, maxLength) {
  if (!text || text.length <= maxLength) return text || '';
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

function estimateTokenCount(obj) {
  return Math.ceil(JSON.stringify(obj).length / 4);
}

function enforceTokenLimit(context, history) {
  const overhead = 100;

  function totalTokens() {
    return estimateTokenCount(context) + estimateTokenCount(history) + overhead;
  }

  while (totalTokens() > MAX_CONTEXT_TOKENS) {
    if (history.length > 0) {
      history.shift();
      continue;
    }
    if (context.longTermMemory && context.longTermMemory.length > 3) {
      context.longTermMemory.pop();
      continue;
    }
    if (context.dreamCoach && context.dreamCoach.evolution?.length > 2) {
      context.dreamCoach.evolution.pop();
      continue;
    }
    if (context.timeline && context.timeline.length > 5) {
      context.timeline.pop();
      continue;
    }
    if (context.lifeInsights) {
      if (context.lifeInsights.strengths?.length > 3) { context.lifeInsights.strengths.pop(); continue; }
      if (context.lifeInsights.attentionPoints?.length > 3) { context.lifeInsights.attentionPoints.pop(); continue; }
      if (context.lifeInsights.habits?.length > 3) { context.lifeInsights.habits.pop(); continue; }
    }
    if (context.recentDreams && context.recentDreams.length > 2) {
      context.recentDreams.pop();
      continue;
    }
    if (context.recentEmotions && context.recentEmotions.length > 2) {
      context.recentEmotions.pop();
      continue;
    }
    if (context.activeJourneys && context.activeJourneys.length > 2) {
      context.activeJourneys.pop();
      continue;
    }
    break;
  }

  return { context, history };
}

function buildFocusedContext({ focusedType, recentDreams, recentEmotions }) {
  const ctx = {
    contextVersion: 'v2-focused',
    focusedType,
    longTermMemory: [],
    summaryLongTerm: null,
    summary: { totalDreams: 0, totalEmotions: 0, avgSleepHours: null },
    dreamScore: null,
    profile: null,
    recentDreams: recentDreams ? recentDreams.map(d => ({
      summary: truncateAtWord(d.textoSonho, DREAM_SUMMARY_LENGTH),
      shortInterpretation: truncateAtWord(d.interpretacao, INTERPRETATION_SUMMARY_LENGTH),
      category: d.dreamCategory,
      tags: d.tags || [],
      createdAt: d.createdAt,
    })) : [],
    recentEmotions: recentEmotions ? recentEmotions.map(e => ({
      emotion: e.emotion,
      intensity: e.intensity,
      causes: e.causes || [],
      summary: truncateAtWord(e.originalText, EMOTION_SUMMARY_LENGTH),
      createdAt: e.createdAt,
    })) : [],
    predominantTags: [],
    predominantCategories: [],
    recurrentSymbols: [],
    correlations: {},
    dreamStats: { categories: [], perMonth: [], mostFrequentCategory: null },
    emotionStats: { distribution: [], predominant: null, averageIntensity: 0, intensityTrend: {} },
    sleepStats: { avgSleepHours: null, avgBedTime: null, avgWakeTime: null, trend: {} },
    reportSummary: null,
    reportConclusion: null,
    recommendations: [],
    warnings: [],
    positiveHabits: [],
    dreamCoach: null,
    timeline: [],
    proactiveInsights: [],
    conversationMemories: [],
    adaptiveProfile: null,
    personalityProfile: null,
    lifeInsights: null,
    activeGoals: [],
    completedGoals: [],
    goalProgress: null,
    qualitySummary: null,
    importantRelationships: [],
    activeJourneys: [],
    continuousNarrative: null,
  };
  return ctx;
}

async function buildContext(userId, options = {}) {
  const { contextType, dreamId, emotionId } = options;

  if (contextType === 'dream' && dreamId) {
    const dream = await Dream.findOne({ _id: dreamId, userId })
      .select('textoSonho interpretacao dreamCategory tags aiData.symbols createdAt')
      .lean();
    if (!dream) throw new Error('Sonho não encontrado.');
    return buildFocusedContext({ focusedType: 'dream', recentDreams: [dream] });
  }

  if (contextType === 'emotion' && emotionId) {
    const emotion = await EmotionJournal.findOne({ _id: emotionId, userId })
      .select('emotion intensity causes originalText createdAt')
      .lean();
    if (!emotion) throw new Error('Emoção não encontrada.');
    return buildFocusedContext({ focusedType: 'emotion', recentEmotions: [emotion] });
  }
  const [memory, dreams, emotions, memoryFacts, coach, timeline, insights, convMemories, activeGoals, completedGoals, qualitySummary, importantRelationships, activeJourneys] = await Promise.all([
    memoryService.getMemory(userId),
    Dream.find({ userId })
      .sort({ createdAt: -1 })
      .limit(DREAM_LIMIT)
      .select('textoSonho interpretacao dreamCategory tags aiData.symbols createdAt')
      .lean(),
    EmotionJournal.find({ userId })
      .sort({ createdAt: -1 })
      .limit(EMOTION_LIMIT)
      .select('emotion intensity causes originalText createdAt')
      .lean(),
    memoryExtraction.getFacts(userId),
    dreamCoach.generateCoachReport(userId).catch(() => null),
    timelineService.generateTimeline(userId).catch(() => null),
    lifeInsightsService.generateLifeInsights(userId).catch(() => null),
    conversationMemory.getMemories(userId),
    goalTracking.getActiveGoals(userId),
    goalTracking.getCompletedGoals(userId),
    cognitiveQuality.getQualitySummary(userId),
    relationshipMemory.getImportantRelationships(userId),
    longTermCompanion.getActiveJourneys(userId).catch(() => []),
  ]);

  const ctx = {
    contextVersion: 'v2',
    longTermMemory: memoryFacts.facts,
    summaryLongTerm: memoryFacts.summaryLongTerm,
    summary: {
      totalDreams: memory?.stats?.totalDreams || 0,
      totalEmotions: memory?.stats?.totalEmotions || 0,
      avgSleepHours: memory?.sono?.averageSleep || null,
    },
    dreamScore: memory?.profile?.dreamScore || null,
    profile: memory?.profile?.dreamProfile ? {
      type: memory.profile.dreamProfile,
      confidence: memory.profile.confidence,
    } : null,
    recentDreams: dreams.map(d => ({
      summary: truncateAtWord(d.textoSonho, DREAM_SUMMARY_LENGTH),
      shortInterpretation: truncateAtWord(d.interpretacao, INTERPRETATION_SUMMARY_LENGTH),
      category: d.dreamCategory,
      tags: d.tags || [],
      createdAt: d.createdAt,
    })),
    recentEmotions: emotions.map(e => ({
      emotion: e.emotion,
      intensity: e.intensity,
      causes: e.causes || [],
      summary: truncateAtWord(e.originalText, EMOTION_SUMMARY_LENGTH),
      createdAt: e.createdAt,
    })),
    predominantTags: (memory?.tags?.topTags || []).slice(0, 10),
    predominantCategories: (memory?.dreams?.predominantCategories || []).slice(0, 5),
    recurrentSymbols: (memory?.tags?.topSymbols || []).slice(0, 10),
    correlations: memory?.correlacoes ? {
      strongestCorrelations: memory.correlacoes.strongestCorrelations || [],
      stressCategory: memory.correlacoes.stressCategory,
      anxietyCategory: memory.correlacoes.anxietyCategory,
      calmSleepCategory: memory.correlacoes.calmSleepCategory,
      mostPositiveCategory: memory.correlacoes.mostPositiveCategory,
      mostNegativeCategory: memory.correlacoes.mostNegativeCategory,
    } : {},
    dreamStats: {
      categories: (memory?.dreams?.predominantCategories || []).map(c => ({
        category: c.category,
        percentage: c.percentage,
      })),
      perMonth: [],
      mostFrequentCategory: memory?.dreams?.predominantCategories?.[0]?.category || null,
    },
    emotionStats: {
      distribution: memory?.emotions?.emotionDistribution || [],
      predominant: memory?.emotions?.predominantEmotion || null,
      averageIntensity: memory?.behavior?.averageEmotionIntensity || 0,
      intensityTrend: memory?.emotions?.emotionalTrend || {},
    },
    sleepStats: {
      avgSleepHours: memory?.sono?.averageSleep || null,
      avgBedTime: memory?.sono?.averageBedTime || null,
      avgWakeTime: memory?.sono?.averageWakeTime || null,
      trend: memory?.sono?.sleepTrend || {},
    },
    reportSummary: memory?.resumo?.summary || null,
    reportConclusion: null,
    recommendations: (memory?.insights?.recommendations || []).slice(0, 3),
    warnings: memory?.insights?.warnings || [],
    positiveHabits: memory?.insights?.positiveHabits || [],
    dreamCoach: coach ? {
      overallStatus: coach.overallStatus,
      evolution: coach.evolution?.slice(0, 4) || [],
      positives: coach.positives?.slice(0, 3) || [],
      concerns: coach.concerns?.slice(0, 3) || [],
      motivation: coach.motivation || null,
    } : null,
    timeline: timeline ? timeline.slice(0, 10).map(e => ({
      date: e.date,
      type: e.type,
      title: e.title,
      description: e.description,
      importance: e.importance,
      category: e.category,
    })) : [],
    proactiveInsights: (memory?.proactiveInsights || []).filter(i => i.isActive).slice(0, 5),
    conversationMemories: convMemories || [],
    adaptiveProfile: memory?.adaptiveProfile || null,
    personalityProfile: memory?.personalityProfile || null,
    lifeInsights: insights ? {
      strengths: insights.strengths?.slice(0, 5) || [],
      attentionPoints: insights.attentionPoints?.slice(0, 5) || [],
      habits: insights.habits?.slice(0, 5) || [],
      emotionalEvolution: insights.emotionalEvolution?.slice(0, 3) || [],
      sleepEvolution: insights.sleepEvolution?.slice(0, 3) || [],
      achievements: insights.achievements?.slice(0, 5) || [],
      motivation: insights.motivation || null,
    } : null,
    activeGoals: activeGoals || [],
    completedGoals: completedGoals || [],
    goalProgress: (activeGoals && activeGoals.length > 0)
      ? Math.round(activeGoals.reduce((s, g) => s + (g.progress || 0), 0) / activeGoals.length)
      : null,
    qualitySummary,
    importantRelationships: importantRelationships || [],
    activeJourneys: activeJourneys || [],
  };

  ctx.continuousNarrative = narrativeContinuity.buildNarrative(ctx);
  longTermCompanion.processJourneys(userId, ctx).catch(() => {});
  return ctx;
}

async function findOrCreateConversation(userId, conversationId = null, newConversation = false) {
  if (conversationId) {
    const lastMessage = await ChatMessage.findOne({ userId, conversationId })
      .sort({ messageIndex: -1 })
      .select('conversationTitle messageIndex')
      .lean();

    if (lastMessage) {
      return {
        conversationId,
        conversationTitle: lastMessage.conversationTitle,
        nextIndex: (lastMessage.messageIndex || 0) + 1,
      };
    }

    return {
      conversationId,
      conversationTitle: null,
      nextIndex: 1,
    };
  }

  if (newConversation) {
    const newId = new mongoose.Types.ObjectId();
    const conversationCount = await ChatMessage.distinct('conversationId', { userId, contextType: { $in: ['general', null] } });
    return {
      conversationId: newId,
      conversationTitle: `Conversa ${conversationCount.length + 1}`,
      nextIndex: 1,
    };
  }

  const lastMessage = await ChatMessage.findOne({ userId, contextType: { $in: ['general', null] } })
    .sort({ createdAt: -1 })
    .select('conversationId conversationTitle messageIndex')
    .lean();

  if (lastMessage) {
    return {
      conversationId: lastMessage.conversationId,
      conversationTitle: lastMessage.conversationTitle,
      nextIndex: (lastMessage.messageIndex || 0) + 1,
    };
  }

  const newId = new mongoose.Types.ObjectId();
  return {
    conversationId: newId,
    conversationTitle: 'Conversa 1',
    nextIndex: 1,
  };
}

async function loadConversationHistory(userId, conversationId, limit = HISTORY_LIMIT) {
  const messages = await ChatMessage.find({ userId, conversationId })
    .sort({ messageIndex: -1 })
    .limit(limit)
    .select('question answer messageIndex')
    .lean();

  messages.reverse();
  return messages;
}

function getAutoTitle(firstQuestion) {
  if (!firstQuestion) return 'Nova conversa';
  const words = firstQuestion.split(/\s+/).filter(Boolean);
  return words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');
}

async function listConversations(userId) {
  const raw = await ChatMessage.aggregate([
    { $match: { userId, contextType: { $in: ['general', null] } } },
    {
      $group: {
        _id: '$conversationId',
        conversationTitle: { $last: '$conversationTitle' },
        firstQuestion: { $first: '$question' },
        totalMessages: { $sum: 1 },
        lastMessage: { $last: '$question' },
        createdAt: { $min: '$createdAt' },
        updatedAt: { $max: '$createdAt' },
      },
    },
    { $sort: { updatedAt: -1 } },
  ]);

  return raw.map(c => ({
    conversationId: c._id,
    title: c.conversationTitle || getAutoTitle(c.firstQuestion),
    totalMessages: c.totalMessages,
    lastMessage: c.lastMessage,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

async function getConversation(userId, conversationId) {
  const messages = await ChatMessage.find({
    userId,
    conversationId,
    contextType: { $in: ['general', null] },
  })
    .sort({ messageIndex: 1 })
    .select('question answer messageIndex createdAt')
    .lean();

  return messages;
}

async function updateConversationTitle(userId, conversationId, newTitle) {
  const trimmed = newTitle.trim();
  if (!trimmed) throw new Error('O título não pode estar vazio.');
  if (trimmed.length > 100) throw new Error('O título deve ter no máximo 100 caracteres.');

  const result = await ChatMessage.updateMany(
    { userId, conversationId, contextType: { $in: ['general', null] } },
    { $set: { conversationTitle: trimmed } },
  );

  if (result.matchedCount === 0) throw new Error('Conversa não encontrada.');

  return { title: trimmed };
}

async function deleteConversation(userId, conversationId) {
  const result = await ChatMessage.deleteMany({ userId, conversationId, contextType: { $in: ['general', null] } });

  if (result.deletedCount === 0) throw new Error('Conversa não encontrada.');

  return { deletedCount: result.deletedCount };
}

async function sendChat(userId, question, options = {}) {
  const { conversationId = null, newConversation = false, contextType, dreamId, emotionId } = options;
  const model = AI_PROVIDERS.deepseek.primary.model;
  const temperature = 0.4;
  const startTime = Date.now();
  console.log('[INV] sendChat.entry userId=', userId, 'question=', question?.substring(0, 80), 'contextType=', contextType, 'dreamId=', dreamId, 'emotionId=', emotionId, 'conversationId=', conversationId);

  const { conversationId: cid, conversationTitle, nextIndex } = await findOrCreateConversation(userId, conversationId, newConversation);
  console.log('[INV] sendChat.findOrCreateConversation cid=', cid, 'title=', conversationTitle, 'nextIndex=', nextIndex);

  let context = await buildContext(userId, { contextType, dreamId, emotionId });
  console.log('[INV] sendChat.buildContext done contextType=', contextType, 'dreamId=', dreamId, 'recentDreams=', context?.recentDreams?.length, 'recentEmotions=', context?.recentEmotions?.length);
  const t1 = Date.now();
  context = selectContext(question, context);
  const t2 = Date.now();

  const plan = classifyResponse(question, context);
  const t3 = Date.now();
  const emotionalState = emotionalIntelligence.analyze(question, plan, context);
  const t4 = Date.now();
  context.conversationIntent = conversationIntent.detectIntent(question, context, plan, emotionalState);
  context.responseGoal = responseGoal.defineGoal(question, context.conversationIntent, plan, emotionalState, context);
  const decisions = cognitiveDecision.decide(question, context, plan, emotionalState, context.adaptiveProfile);
  const initiative = conversationalInitiative.evaluate(question, context);
  const strategy = conversationStrategy.evaluate(question, context, context.adaptiveProfile, emotionalState, plan, decisions, initiative);
  const orchestration = cognitiveOrchestrator.orchestrate(question, decisions, plan, emotionalState, context.adaptiveProfile, context);
  const cognitiveContext = unifiedContext.build(context, plan, emotionalState, initiative, decisions, orchestration);
  const t5 = Date.now();
  cognitiveContext.activeStrategy = strategy;
  cognitiveContext.cognitiveOrchestration = orchestration;
  cognitiveContext.activeReasoning = cognitiveReasoning.reason({ question, cognitiveContext, decisions, strategy, emotionalState });
  cognitiveContext.conversationIntent = context.conversationIntent;
  cognitiveContext.responseGoal = context.responseGoal;
  cognitiveContext.conversationPlan = conversationPlanning.definePlan(question, context.conversationIntent, context.responseGoal, strategy, decisions, cognitiveContext.activeReasoning, emotionalState, context);
  cognitiveContext.responseOptimization = responseOptimization.optimize({
    question,
    conversationIntent: context.conversationIntent,
    responseGoal: context.responseGoal,
    conversationPlan: cognitiveContext.conversationPlan,
    cognitiveReasoning: cognitiveContext.activeReasoning,
    cognitiveDecision: decisions,
    conversationStrategy: strategy,
    emotionalState,
    adaptiveProfile: context.adaptiveProfile,
    cognitiveContext,
  });

  let history = await loadConversationHistory(userId, cid, HISTORY_LIMIT);
  console.log('[INV] sendChat.historyLoaded count=', history.length, 'cids=', history.map(h => h.messageIndex));

  const enforced = enforceTokenLimit(context, history);
  history = enforced.history;
  console.log('[INV] sendChat.afterTokenLimit contextSize=', estimateTokenCount(context), 'historySize=', estimateTokenCount(history));

  const { messages } = buildChatPrompt(question, context, history, plan, emotionalState, cognitiveContext, initiative, decisions, strategy);
  const t6 = Date.now();
  console.log('[INV] sendChat.buildChatPrompt messagesCount=', messages.length, 'roles=', messages.map(m => m.role), 'lastRole=', messages[messages.length - 1]?.role, 'lastContentPreview=', messages[messages.length - 1]?.content?.substring(0, 100));

  let answer;
  let promptTokens = null;
  let completionTokens = null;
  try {
    console.log('[INV] sendChat.callingDeepSeek messageCount=', messages.length);
    const result = await deepseekService.sendChat(messages, temperature);
    console.log('[INV] sendChat.deepSeekResponse content=', result?.content?.substring(0, 100), 'promptTokens=', result?.promptTokens, 'completionTokens=', result?.completionTokens);
    answer = result.content;
    promptTokens = result.promptTokens;
    completionTokens = result.completionTokens;
  } catch (error) {
    console.log('[INV] sendChat.deepSeekCATCH error.message=', error.message, 'error.name=', error.name, 'error.code=', error.code, 'error.status=', error.response?.status, 'error.data=', JSON.stringify(error.response?.data)?.substring(0, 300), 'stack=', error.stack?.substring(0, 500));
    answer = 'Desculpe, não foi possível processar sua pergunta agora. Tente novamente em instantes.';
  }
  const t7 = Date.now();

  const reflection = selfReflection.evaluate(question, answer, plan, emotionalState, initiative);

  const latency = t7 - startTime;

  let effectiveTitle = conversationTitle || (nextIndex === 1 ? getAutoTitle(question) : null);
  let contextLabel = null;

  if (nextIndex === 1 && contextType === 'dream') {
    const dream = context.recentDreams?.[0];
    if (dream) {
      const label = dream.category || getAutoTitle(dream.summary || question);
      effectiveTitle = `Sonho - ${label}`;
      contextLabel = label;
    }
  } else if (nextIndex === 1 && contextType === 'emotion') {
    const emotion = context.recentEmotions?.[0];
    if (emotion) {
      effectiveTitle = `Emoção - ${emotion.emotion}`;
      contextLabel = emotion.emotion;
    }
  }

  const docToSave = {
    userId,
    conversationId: cid,
    conversationTitle: effectiveTitle,
    messageIndex: nextIndex,
    question,
    answer,
    model,
    temperature,
    contextVersion: 'v2',
    contextType: contextType || 'general',
    dreamId: dreamId || null,
    emotionId: emotionId || null,
    contextLabel,
    latency,
    promptTokens,
    completionTokens,
  };
  console.log('[INV] sendChat.saving docToSave=', { conversationId: cid, messageIndex: nextIndex, contextType, dreamId, emotionId, answerLength: answer?.length });
  await ChatMessage.create(docToSave);

  memoryExtraction.extractAndSave(userId, cid, question).catch(() => {});
  reflectionService.process(userId, cid, question, answer, plan, context).catch(() => {});
  proactiveInsightService.detectChanges(userId).catch(() => {});
  conversationMemory.update(userId, cid, question, answer).catch(() => {});
  adaptiveLearning.learn(userId, question, answer, plan, emotionalState, reflection, initiative).catch(() => {});
  cognitiveQuality.evaluate(userId, cid, question, answer, plan, emotionalState, initiative, reflection, context, cognitiveContext).catch(() => {});
  personalityEngine.update(userId, question, answer, plan, emotionalState, reflection, initiative, context.qualitySummary, context.adaptiveProfile).catch(() => {});
  relationshipMemory.update(userId, cid, question, answer).catch(() => {});
  goalTracking.update(userId, cid, question, answer, context).catch(() => {});

  cognitiveEvaluation.evaluate({
    userId, question, cognitiveContext, plan, emotionalState, context,
    timings: {
      contextSelection: t2 - t1,
      responsePlanning: t3 - t2,
      emotionalIntelligence: t4 - t3,
      unifiedContext: t5 - t4,
      promptBuilder: t6 - t5,
      deepseek: t7 - t6,
    },
    answer, promptTokens, completionTokens,
  });

  const contextSize = estimateTokenCount(context);
  const factsLoaded = context.longTermMemory?.length || 0;
  const dreamsLoaded = context.recentDreams?.length || 0;
  const emotionsLoaded = context.recentEmotions?.length || 0;
  console.log(`[ChatMetrics] userId=${userId} promptTokens=${promptTokens} completionTokens=${completionTokens} latency=${latency}ms contextSize=${contextSize} facts=${factsLoaded} dreams=${dreamsLoaded} emotions=${emotionsLoaded}`);

  return {
    answer,
    createdAt: new Date().toISOString(),
    conversationId: cid.toString(),
  };
}

module.exports = { sendChat, listConversations, getConversation, updateConversationTitle, deleteConversation };
