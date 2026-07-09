const UserMemory = require('../models/UserMemory');

const CLAMP = 100;
const LEARN_RATE = 0.03;

function clamp(val) {
  return Math.min(CLAMP, Math.max(0, Math.round(val)));
}

function lerp(current, target) {
  return clamp(current + (target - current) * LEARN_RATE);
}

async function update(userId, question, answer, plan, emotionalState, reflection, initiative, qualitySummary, adaptiveProfile) {
  try {
    const memory = await UserMemory.findOne({ userId });
    if (!memory) return;

    if (!memory.personalityProfile) {
      memory.personalityProfile = {
        warmth: 60, empathy: 70, curiosity: 50, humor: 30,
        optimism: 55, directness: 40, playfulness: 35,
        reflectionLevel: 60, conversationEnergy: 50,
        updatedAt: new Date(),
      };
    }

    let pp = memory.personalityProfile;
    let warmth = pp.warmth || 60;
    let empathy = pp.empathy || 70;
    let curiosity = pp.curiosity || 50;
    let humor = pp.humor || 30;
    let optimism = pp.optimism || 55;
    let directness = pp.directness || 40;
    let playfulness = pp.playfulness || 35;
    let reflectionLevel = pp.reflectionLevel || 60;
    let conversationEnergy = pp.conversationEnergy || 50;

    if (adaptiveProfile) {
      const style = adaptiveProfile.preferredResponseStyle || 'medium';
      if (style === 'short') {
        directness = lerp(directness, 80);
        warmth = lerp(warmth, 45);
      } else if (style === 'detailed') {
        directness = lerp(directness, 25);
        reflectionLevel = lerp(reflectionLevel, 80);
      }

      if (adaptiveProfile.preferredEmpathyLevel === 'high') {
        empathy = lerp(empathy, 90);
        warmth = lerp(warmth, 80);
      } else if (adaptiveProfile.preferredEmpathyLevel === 'low') {
        empathy = lerp(empathy, 35);
      }

      if (adaptiveProfile.likesContextConnections) {
        curiosity = lerp(curiosity, 75);
        reflectionLevel = lerp(reflectionLevel, 75);
      }

      if (adaptiveProfile.likesObjectiveAnswers) {
        directness = lerp(directness, 70);
        playfulness = lerp(playfulness, 15);
      }

      if (adaptiveProfile.likesFollowUpQuestions) {
        curiosity = lerp(curiosity, 80);
        conversationEnergy = lerp(conversationEnergy, 70);
      }

      if (adaptiveProfile.preferredConversationLength === 'long') {
        conversationEnergy = lerp(conversationEnergy, 75);
        reflectionLevel = lerp(reflectionLevel, 70);
      } else if (adaptiveProfile.preferredConversationLength === 'short') {
        conversationEnergy = lerp(conversationEnergy, 35);
      }
    }

    if (qualitySummary) {
      if (qualitySummary.preferredContextLevel === 'high') {
        curiosity = lerp(curiosity, 75);
        reflectionLevel = lerp(reflectionLevel, 70);
      } else if (qualitySummary.preferredContextLevel === 'low') {
        curiosity = lerp(curiosity, 35);
      }

      if (qualitySummary.preferredInitiativeLevel === 'high') {
        curiosity = lerp(curiosity, 70);
      } else if (qualitySummary.preferredInitiativeLevel === 'low') {
        curiosity = lerp(curiosity, 35);
      }

      if (qualitySummary.preferredConversationDepth === 'profunda') {
        reflectionLevel = lerp(reflectionLevel, 80);
      } else if (qualitySummary.preferredConversationDepth === 'superficial') {
        reflectionLevel = lerp(reflectionLevel, 30);
        conversationEnergy = lerp(conversationEnergy, 35);
      }
    }

    if (emotionalState) {
      const mode = emotionalState.conversationMode || '';

      if (mode === 'support' || mode === 'emotional_support' || mode === 'deep_listening') {
        empathy = lerp(empathy, 88);
        warmth = lerp(warmth, 80);
        humor = lerp(humor, 20);
        optimism = lerp(optimism, 60);
      }

      if (mode === 'objective' || mode === 'curiosity' || mode === 'technical') {
        directness = lerp(directness, 65);
        playfulness = lerp(playfulness, 20);
      }

      if (mode === 'celebratory' || mode === 'motivational') {
        optimism = lerp(optimism, 80);
        playfulness = lerp(playfulness, 55);
        conversationEnergy = lerp(conversationEnergy, 70);
      }

      if (mode === 'reflective') {
        reflectionLevel = lerp(reflectionLevel, 85);
      }
    }

    if (reflection) {
      if (reflection.emotionalAlignment) {
        empathy = lerp(empathy, 82);
      }

      if (reflection.tooVerbose) {
        directness = lerp(directness, 60);
        conversationEnergy = lerp(conversationEnergy, 35);
      }

      if (reflection.tooShort) {
        warmth = lerp(warmth, 55);
        reflectionLevel = lerp(reflectionLevel, 45);
      }

      if (reflection.roboticLanguage) {
        warmth = lerp(warmth, 75);
        playfulness = lerp(playfulness, 50);
        humor = lerp(humor, 40);
      }

      if (reflection.initiativeQuality === 'good') {
        curiosity = lerp(curiosity, 70);
      }

      if (reflection.answerCompleted === false) {
        conversationEnergy = lerp(conversationEnergy, 65);
        reflectionLevel = lerp(reflectionLevel, 50);
      }
    }

    const aWords = (answer || '').split(/\s+/).filter(Boolean).length;
    if (aWords > 0) {
      if (aWords <= 15) {
        conversationEnergy = lerp(conversationEnergy, 30);
        directness = lerp(directness, 70);
      } else if (aWords > 100) {
        conversationEnergy = lerp(conversationEnergy, 65);
        reflectionLevel = lerp(reflectionLevel, 70);
      } else {
        conversationEnergy = lerp(conversationEnergy, 55);
      }
    }

    const updated = {
      warmth, empathy, curiosity, humor, optimism,
      directness, playfulness, reflectionLevel, conversationEnergy,
      updatedAt: new Date(),
    };

    const changed = Object.keys(updated).filter(k => k !== 'updatedAt' && Math.abs(pp[k] - updated[k]) >= 1);

    if (changed.length > 0) {
      await UserMemory.updateOne(
        { userId },
        { $set: { personalityProfile: updated } },
      );
    }
  } catch (err) {
    console.error('[PersonalityEngine] update error:', err.message);
  }
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

function buildSummary(profile) {
  if (!profile) return null;
  return {
    warmth: label(profile.warmth, 35, 65),
    empathy: label(profile.empathy, 35, 65),
    curiosity: label(profile.curiosity, 35, 65),
    humor: label(profile.humor, 25, 50),
    optimism: label(profile.optimism, 35, 65),
    directness: label(profile.directness, 35, 65),
    playfulness: label(profile.playfulness, 25, 50),
    reflectionLevel: label(profile.reflectionLevel, 35, 65),
    conversationEnergy: energyLabel(profile.conversationEnergy),
  };
}

module.exports = { update, buildSummary };
