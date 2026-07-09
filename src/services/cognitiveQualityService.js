const ConversationQuality = require('../models/ConversationQuality');

const WINDOW_SIZE = 20;

async function evaluate(userId, conversationId, question, answer, plan, emotionalState, initiative, reflection, context, cognitiveContext) {
  try {
    const aWords = (answer || '').split(/\s+/).filter(Boolean).length;
    const qWords = (question || '').split(/\s+/).filter(Boolean).length;

    let responseLength = aWords;
    let responseDepth = '';
    if (aWords <= 15) responseDepth = 'superficial';
    else if (aWords <= 60) responseDepth = 'média';
    else responseDepth = 'profunda';

    let responseQuality = 50;
    if (reflection) {
      if (reflection.answerCompleted) responseQuality += 20;
      if (reflection.emotionalAlignment) responseQuality += 15;
      if (reflection.tooVerbose) responseQuality -= 20;
      if (reflection.tooShort) responseQuality -= 15;
      if (reflection.repetitionDetected) responseQuality -= 10;
      if (reflection.roboticLanguage) responseQuality -= 15;
    }
    responseQuality = Math.max(0, Math.min(100, responseQuality));

    let engagement = 50;
    if (qWords > 3) engagement += 10;
    if (aWords > 20 && aWords <= 100) engagement += 15;
    if (aWords > 100) engagement += 5;
    if (aWords <= 5) engagement -= 20;
    engagement = Math.max(0, Math.min(100, engagement));

    let followUpGenerated = false;
    let followUpAnswered = false;
    if (cognitiveContext && cognitiveContext.activeStrategy) {
      followUpGenerated = cognitiveContext.activeStrategy.shouldAskFollowUp === true;
    }

    let initiativeUsed = false;
    let initiativeAccepted = false;
    if (initiative && initiative.shouldSuggest) {
      initiativeUsed = true;
      if (reflection && reflection.initiativeQuality === 'good') {
        initiativeAccepted = true;
      }
    }

    let emotionalAlignmentScore = 50;
    if (reflection && reflection.emotionalAlignment) {
      emotionalAlignmentScore = 85;
    } else if (reflection && reflection.emotionalAlignment === false) {
      emotionalAlignmentScore = 20;
    }
    if (emotionalState && !emotionalState.detectedEmotion) {
      emotionalAlignmentScore = 50;
    }

    let contextUsage = 0;
    let memoryUsage = 0;
    let dreamCoachUsage = 0;
    let timelineUsage = 0;
    let lifeInsightsUsage = 0;
    let goalTrackingUsage = 0;
    let proactiveInsightsUsage = 0;

    if (cognitiveContext) {
      if (cognitiveContext.activeMemories && cognitiveContext.activeMemories.length > 0) {
        memoryUsage = Math.min(cognitiveContext.activeMemories.length * 30, 100);
        contextUsage += memoryUsage * 0.25;
      }
      if (cognitiveContext.activeInsights && cognitiveContext.activeInsights.length > 0) {
        proactiveInsightsUsage = Math.min(cognitiveContext.activeInsights.length * 30, 100);
        contextUsage += proactiveInsightsUsage * 0.15;
      }
      if (cognitiveContext.activePatterns) {
        const p = cognitiveContext.activePatterns;
        if (p.dreamCoach) dreamCoachUsage = 80;
        if (p.lifeInsights && (p.lifeInsights.strengths || p.lifeInsights.habits)) lifeInsightsUsage = 70;
        if (p.categories || p.symbols) contextUsage += 10;
      }
      if (cognitiveContext.activeTimeline && cognitiveContext.activeTimeline.length > 0) {
        timelineUsage = Math.min(cognitiveContext.activeTimeline.length * 30, 100);
        contextUsage += timelineUsage * 0.15;
      }
      if (cognitiveContext.activeGoals && cognitiveContext.activeGoals.length > 0) {
        goalTrackingUsage = Math.min(cognitiveContext.activeGoals.length * 30, 100);
        contextUsage += goalTrackingUsage * 0.15;
      }
      if (cognitiveContext.activeConversations && cognitiveContext.activeConversations.length > 0) {
        contextUsage += Math.min(cognitiveContext.activeConversations.length * 15, 30);
      }
      contextUsage = Math.min(100, Math.round(contextUsage));
    }

    let conversationScore = Math.round(
      responseQuality * 0.3 +
      engagement * 0.2 +
      emotionalAlignmentScore * 0.15 +
      (initiativeUsed ? (initiativeAccepted ? 15 : 5) : 10) * 1 +
      contextUsage * 0.1 +
      (followUpGenerated ? 10 : 0)
    );
    conversationScore = Math.max(0, Math.min(100, conversationScore));

    await ConversationQuality.create({
      userId,
      conversationId,
      conversationScore,
      responseQuality,
      engagement,
      followUpGenerated,
      followUpAnswered,
      initiativeUsed,
      initiativeAccepted,
      emotionalAlignment: emotionalAlignmentScore,
      contextUsage,
      memoryUsage,
      dreamCoachUsage,
      timelineUsage,
      lifeInsightsUsage,
      goalTrackingUsage,
      proactiveInsightsUsage,
      responseLength,
      responseDepth,
    }).catch(err => {
      if (err.code !== 11000) console.error('[CognitiveQuality] create error:', err.message);
    });
  } catch (err) {
    console.error('[CognitiveQuality] evaluate error:', err.message);
  }
}

async function getQualitySummary(userId) {
  try {
    const records = await ConversationQuality.find({ userId })
      .sort({ createdAt: -1 })
      .limit(WINDOW_SIZE)
      .lean();

    if (records.length === 0) {
      return {
        averageConversationScore: 0,
        averageEngagement: 0,
        averageFollowUp: 0,
        preferredConversationDepth: 'média',
        preferredContextLevel: 'medium',
        preferredInitiativeLevel: 'medium',
      };
    }

    const avg = (key) => Math.round(records.reduce((s, r) => s + (r[key] || 0), 0) / records.length);

    const avgScore = avg('conversationScore');
    const avgEngagement = avg('engagement');
    const followUpRate = records.filter(r => r.followUpGenerated).length > 0
      ? Math.round(records.filter(r => r.followUpGenerated && r.followUpAnswered).length / records.filter(r => r.followUpGenerated).length * 100)
      : 0;

    const depthCounts = { superficial: 0, média: 0, profunda: 0 };
    for (const r of records) {
      if (r.responseDepth && depthCounts[r.responseDepth] !== undefined) {
        depthCounts[r.responseDepth]++;
      }
    }
    const preferredDepth = Object.entries(depthCounts).sort((a, b) => b[1] - a[1])[0][0];

    const avgContext = avg('contextUsage');
    let preferredContextLevel = 'medium';
    if (avgContext < 30) preferredContextLevel = 'low';
    else if (avgContext > 70) preferredContextLevel = 'high';

    const initAcceptRate = records.filter(r => r.initiativeUsed).length > 0
      ? Math.round(records.filter(r => r.initiativeUsed && r.initiativeAccepted).length / records.filter(r => r.initiativeUsed).length * 100)
      : 0;
    let preferredInitiativeLevel = 'medium';
    if (initAcceptRate < 30) preferredInitiativeLevel = 'low';
    else if (initAcceptRate > 70) preferredInitiativeLevel = 'high';

    return {
      averageConversationScore: avgScore,
      averageEngagement: avgEngagement,
      averageFollowUp: followUpRate,
      preferredConversationDepth: preferredDepth,
      preferredContextLevel,
      preferredInitiativeLevel,
    };
  } catch (err) {
    console.error('[CognitiveQuality] getQualitySummary error:', err.message);
    return null;
  }
}

module.exports = { evaluate, getQualitySummary };
