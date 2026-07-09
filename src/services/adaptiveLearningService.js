const UserMemory = require('../models/UserMemory');

const SCORE_MAX = 10;

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function lerpScore(current, target, rate) {
  return clamp(current + (target - current) * rate, 0, SCORE_MAX);
}

function scoreToStyle(score) {
  if (score <= 3) return 'short';
  if (score <= 7) return 'medium';
  return 'detailed';
}

function scoreToEmpathy(score) {
  if (score <= 3) return 'low';
  if (score <= 7) return 'medium';
  return 'high';
}

function scoreToLength(score) {
  if (score <= 3) return 'short';
  if (score <= 7) return 'medium';
  return 'long';
}

function boolToScore(val) {
  return val ? SCORE_MAX : 0;
}

async function learn(userId, question, answer, plan, emotionalState, reflection, initiative) {
  try {
    const memory = await UserMemory.findOne({ userId }).lean();
    if (!memory) return;

    const profile = memory.adaptiveProfile || {
      preferredResponseStyle: 'medium',
      preferredEmpathyLevel: 'medium',
      likesContextConnections: false,
      likesDreamAnalysis: false,
      likesObjectiveAnswers: false,
      likesFollowUpQuestions: false,
      preferredConversationLength: 'medium',
    };

    const scores = {
      responseStyleScore: scoreToNumeric(profile.preferredResponseStyle),
      empathyScore: scoreToNumeric(profile.preferredEmpathyLevel),
      contextConnectionsScore: profile.likesContextConnections ? SCORE_MAX : 0,
      dreamAnalysisScore: profile.likesDreamAnalysis ? SCORE_MAX : 0,
      objectiveScore: profile.likesObjectiveAnswers ? SCORE_MAX : 0,
      followUpScore: profile.likesFollowUpQuestions ? SCORE_MAX : 0,
      conversationLengthScore: scoreToNumeric(profile.preferredConversationLength),
    };

    const qWords = (question || '').split(/\s+/).filter(Boolean).length;
    const aWords = (answer || '').split(/\s+/).filter(Boolean).length;

    if (reflection) {
      if (reflection.tooVerbose && aWords > 60) {
        scores.responseStyleScore = lerpScore(scores.responseStyleScore, 2, 0.1);
      } else if (reflection.tooShort && aWords < 15) {
        scores.responseStyleScore = lerpScore(scores.responseStyleScore, 9, 0.1);
      } else if (qWords <= 5 && aWords >= 30 && aWords <= 80) {
        scores.responseStyleScore = lerpScore(scores.responseStyleScore, 5, 0.05);
      }

      if (reflection.emotionalAlignment) {
        scores.empathyScore = lerpScore(scores.empathyScore, 8, 0.05);
      } else if (!reflection.emotionalAlignment && emotionalState) {
        const mode = (emotionalState.conversationMode || '');
        if (mode === 'objective' || mode === 'curiosity') {
          scores.empathyScore = lerpScore(scores.empathyScore, 3, 0.05);
        }
      }
    }

    if (emotionalState) {
      const intensity = emotionalState.emotionalIntensity || 'low';
      const mode = emotionalState.conversationMode || '';

      if (intensity === 'high' && mode !== 'objective') {
        scores.empathyScore = lerpScore(scores.empathyScore, 9, 0.1);
      } else if (intensity === 'low' && (mode === 'objective' || mode === 'curiosity')) {
        scores.empathyScore = lerpScore(scores.empathyScore, 3, 0.05);
      }
    }

    if (plan) {
      const rt = plan.responseType || '';
      if (rt === 'factual_question' || rt === 'objective') {
        scores.objectiveScore = lerpScore(scores.objectiveScore, SCORE_MAX, 0.1);
      } else if (rt === 'emotional' || rt === 'personal') {
        scores.objectiveScore = lerpScore(scores.objectiveScore, 0, 0.05);
      }

      if (rt === 'dream_analysis') {
        scores.dreamAnalysisScore = lerpScore(scores.dreamAnalysisScore, SCORE_MAX, 0.15);
      }
    }

    if (initiative) {
      if (initiative.shouldSuggest && reflection && reflection.initiativeQuality === 'good') {
        scores.contextConnectionsScore = lerpScore(scores.contextConnectionsScore, SCORE_MAX, 0.12);
      } else if (initiative.shouldSuggest && reflection && reflection.initiativeQuality === 'missing') {
        scores.contextConnectionsScore = lerpScore(scores.contextConnectionsScore, 0, 0.05);
      }
    }

    if (plan && plan.primaryTopic) {
      const topic = (plan.primaryTopic || '').toLowerCase();
      if (/sonho|sonhar|pesadelo|dream/i.test(topic)) {
        scores.dreamAnalysisScore = lerpScore(scores.dreamAnalysisScore, SCORE_MAX, 0.1);
      }
    }

    const qLower = (question || '').toLowerCase();
    if (/sonho|sonhei|pesadelo/i.test(qLower)) {
      scores.dreamAnalysisScore = lerpScore(scores.dreamAnalysisScore, SCORE_MAX, 0.12);
    }

    if (reflection && reflection.canDeepenConversation && typeof reflection.canDeepenConversation === 'boolean') {
      if (reflection.canDeepenConversation) {
        scores.followUpScore = lerpScore(scores.followUpScore, 0, 0.05);
      } else {
        scores.followUpScore = lerpScore(scores.followUpScore, 7, 0.05);
      }
    }

    scores.conversationLengthScore = lerpScore(scores.conversationLengthScore, scores.followUpScore, 0.05);

    const updated = {
      preferredResponseStyle: scoreToStyle(Math.round(scores.responseStyleScore)),
      preferredEmpathyLevel: scoreToEmpathy(Math.round(scores.empathyScore)),
      likesContextConnections: scores.contextConnectionsScore >= 5,
      likesDreamAnalysis: scores.dreamAnalysisScore >= 5,
      likesObjectiveAnswers: scores.objectiveScore >= 5,
      likesFollowUpQuestions: scores.followUpScore >= 5,
      preferredConversationLength: scoreToLength(Math.round(scores.conversationLengthScore)),
      updatedAt: new Date(),
    };

    const changedFields = [];
    for (const key of Object.keys(updated)) {
      if (key === 'updatedAt') continue;
      const oldVal = profile[key];
      const newVal = updated[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changedFields.push(key);
      }
    }

    if (changedFields.length > 0) {
      await UserMemory.updateOne(
        { userId },
        { $set: { adaptiveProfile: updated } },
      );
    }

    console.log('[ADAPTIVE_LEARNING]', JSON.stringify({
      preferredResponseStyle: updated.preferredResponseStyle,
      preferredEmpathyLevel: updated.preferredEmpathyLevel,
      conversationLength: updated.preferredConversationLength,
      likesContextConnections: updated.likesContextConnections,
      updatedFields: changedFields,
    }));
  } catch (err) {
    console.error('[ADAPTIVE_LEARNING] error:', err.message);
  }
}

function scoreToNumeric(value) {
  if (value === 'short' || value === 'low') return 0;
  if (value === 'medium') return 5;
  if (value === 'long' || value === 'high') return SCORE_MAX;
  if (typeof value === 'boolean') return value ? SCORE_MAX : 0;
  return 5;
}

module.exports = { learn };
