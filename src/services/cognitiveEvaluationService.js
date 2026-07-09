const summaryStore = {
  totalEvaluated: 0,
  totalTokens: 0,
  totalTokensBeforeCompression: 0,
  totalTiming: { contextSelection: 0, responsePlanning: 0, emotionalIntelligence: 0, unifiedContext: 0, promptBuilder: 0, deepseek: 0 },
  blockUsage: {},
};

function estimateTokens(obj) {
  return Math.ceil(JSON.stringify(obj).length / 4);
}

function analyzeBlocks(cognitiveContext) {
  const fields = [
    'personalContext', 'activeMemories', 'activeInsights', 'activeTimeline',
    'activePatterns', 'activeRecommendations', 'activeWarnings', 'emotionalContext', 'conversationContext',
  ];
  const result = { used: [], ignored: [], empty: [] };

  for (const field of fields) {
    const value = cognitiveContext[field];
    if (value === null || value === undefined) {
      result.ignored.push(field);
    } else if (Array.isArray(value) && value.length === 0) {
      result.empty.push(field);
    } else if (typeof value === 'object' && Object.keys(value).length === 0) {
      result.empty.push(field);
    } else {
      result.used.push(field);
    }
  }

  return result;
}

function countMemoryUsage(cognitiveContext) {
  return {
    memoryFactsUsed: (cognitiveContext.activeMemories || []).length,
    proactiveInsightsUsed: (cognitiveContext.activeInsights || []).length,
    timelineEventsUsed: (cognitiveContext.activeTimeline || []).length,
    recommendationsUsed: (cognitiveContext.activeRecommendations || []).length,
    warningsUsed: (cognitiveContext.activeWarnings || []).length,
  };
}

function evaluate(params) {
  const {
    userId, question, cognitiveContext, plan, emotionalState, context,
    timings, answer, promptTokens, completionTokens,
  } = params;

  if (!cognitiveContext) return;

  const tokensAfter = estimateTokens(cognitiveContext);
  const tokensBefore = context ? estimateTokens(context) : tokensAfter;
  const compressionPct = tokensBefore > 0 ? Math.round((1 - tokensAfter / tokensBefore) * 100) : 0;

  const blocks = analyzeBlocks(cognitiveContext);
  const memUsage = countMemoryUsage(cognitiveContext);

  const metrics = {
    timestamp: new Date().toISOString(),
    userId,
    responseType: plan ? plan.responseType : null,
    emotionalMode: emotionalState ? emotionalState.conversationMode : null,
    contextSize: {
      tokensBefore,
      tokensAfter,
      compressionPct,
      blocksUsed: blocks.used.length,
      blocksTotal: 9,
    },
    blocks: {
      used: blocks.used,
      ignored: blocks.ignored,
      empty: blocks.empty,
    },
    memoryUsage: memUsage,
    timing: timings || {},
    deepseek: {
      promptTokens: promptTokens || 0,
      completionTokens: completionTokens || 0,
      totalTokens: (promptTokens || 0) + (completionTokens || 0),
    },
  };

  console.log('[COGNITIVE_METRICS] ' + JSON.stringify(metrics));

  summaryStore.totalEvaluated++;
  summaryStore.totalTokens += tokensAfter;
  summaryStore.totalTokensBeforeCompression += tokensBefore;
  if (timings) {
    if (timings.deepseek) summaryStore.totalTiming.deepseek += timings.deepseek;
    if (timings.contextSelection) summaryStore.totalTiming.contextSelection += timings.contextSelection;
    if (timings.responsePlanning) summaryStore.totalTiming.responsePlanning += timings.responsePlanning;
    if (timings.emotionalIntelligence) summaryStore.totalTiming.emotionalIntelligence += timings.emotionalIntelligence;
    if (timings.unifiedContext) summaryStore.totalTiming.unifiedContext += timings.unifiedContext;
    if (timings.promptBuilder) summaryStore.totalTiming.promptBuilder += timings.promptBuilder;
  }
  for (const b of blocks.used) {
    summaryStore.blockUsage[b] = (summaryStore.blockUsage[b] || 0) + 1;
  }

  return metrics;
}

function generateSummary() {
  const n = summaryStore.totalEvaluated || 1;
  const avgTokens = Math.round(summaryStore.totalTokens / n);
  const avgBefore = Math.round(summaryStore.totalTokensBeforeCompression / n);
  const avgCompression = avgBefore > 0 ? Math.round((1 - avgTokens / avgBefore) * 100) : 0;

  const blockEntries = Object.entries(summaryStore.blockUsage)
    .sort((a, b) => b[1] - a[1])
    .map(([block, count]) => ({ block, usedPct: Math.round((count / n) * 100) }));

  return {
    totalEvaluated: summaryStore.totalEvaluated,
    averageTokens: avgTokens,
    averageTokensBeforeCompression: avgBefore,
    averageCompressionPct: avgCompression,
    averageTiming: {
      contextSelection: Math.round(summaryStore.totalTiming.contextSelection / n),
      responsePlanning: Math.round(summaryStore.totalTiming.responsePlanning / n),
      emotionalIntelligence: Math.round(summaryStore.totalTiming.emotionalIntelligence / n),
      unifiedContext: Math.round(summaryStore.totalTiming.unifiedContext / n),
      promptBuilder: Math.round(summaryStore.totalTiming.promptBuilder / n),
      deepseek: Math.round(summaryStore.totalTiming.deepseek / n),
    },
    mostUsedBlocks: blockEntries.filter(e => e.usedPct > 50),
    leastUsedBlocks: blockEntries.filter(e => e.usedPct <= 50),
  };
}

module.exports = { evaluate, generateSummary };
