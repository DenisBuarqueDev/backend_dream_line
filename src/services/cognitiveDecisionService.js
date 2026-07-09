function decide(question, context, plan, emotionalState, adaptiveProfile, initiative) {
  const rt = (plan && plan.responseType) || '';
  const pt = (plan && plan.primaryTopic) || '';
  const q = (question || '').toLowerCase();
  const emotion = (emotionalState && emotionalState.detectedEmotion) || '';
  const mode = (emotionalState && emotionalState.conversationMode) || '';

  const profile = adaptiveProfile || {};

  const isFactual = rt === 'factual_question' || rt === 'objective';
  const isEmotional = rt === 'emotional';
  const isPersonal = rt === 'personal';
  const isEvolution = rt === 'evolution' || rt === 'comparison';
  const isDreamAnalysis = rt === 'dream_analysis' || /sonho|sonhei|pesadelo|significa sonhar/i.test(q);
  const isGeneralAnswer = rt === 'general' || rt === '';

  const isShortQuestion = q.split(/\s+/).filter(Boolean).length <= 4;
  const isGreeting = /^(oi|ol[áa]|tudo bem|bom dia|boa tarde|boa noite)/i.test(q);

  const isEmotionalByContent = /ansiedade|triste|depress[aã]o|medo|preocupa|cansad[ao]|estresse/i.test(q) && !isDreamAnalysis;

  const hasTechnicalPattern = /como (?:fazer|criar|instalar|configurar)/i.test(q) || /o que [eé] (?:sonho|sonhar)/i.test(q);

  const likesObjective = profile.likesObjectiveAnswers === true;
  const likesConnections = profile.likesContextConnections === true;
  const likesDreamAnalysis = profile.likesDreamAnalysis === true;
  const empathyLevel = profile.preferredEmpathyLevel || 'medium';
  const responseStyle = profile.preferredResponseStyle || 'medium';

  let useUserMemory = true;
  let useMemoryFacts = true;
  let useConversationMemory = false;
  let useDreamCoach = false;
  let useLifeInsights = false;
  let useTimeline = false;
  let useRecentDreams = false;
  let useRecentEmotions = false;
  let useProactiveInsights = false;
  let connectOldDream = false;
  let allowInitiative = false;
  let shouldAskFollowUp = false;
  let responseDepth = 'medium';
  let responseTone = 'supportive';
  let maxConnections = 1;
  let reason = 'default';

  const hasDreamPattern = /sonh[oa]|pesadelo|sonhei/i.test(q);

  if (isDreamAnalysis && hasTechnicalPattern) {
    useUserMemory = true;
    useMemoryFacts = true;
    useConversationMemory = false;
    useDreamCoach = true;
    useLifeInsights = false;
    useTimeline = false;
    useRecentDreams = true;
    useRecentEmotions = true;
    useProactiveInsights = false;
    connectOldDream = true;
    allowInitiative = false;
    shouldAskFollowUp = true;
    responseDepth = responseStyle === 'short' ? 'medium' : 'deep';
    responseTone = 'reflective';
    maxConnections = likesConnections ? 2 : 1;
    reason = 'dream_analysis_technical';
  } else if (isDreamAnalysis) {
    useUserMemory = true;
    useMemoryFacts = true;
    useConversationMemory = false;
    useDreamCoach = true;
    useLifeInsights = false;
    useTimeline = false;
    useRecentDreams = true;
    useRecentEmotions = true;
    useProactiveInsights = false;
    connectOldDream = true;
    allowInitiative = false;
    shouldAskFollowUp = true;
    responseDepth = 'medium';
    responseTone = 'reflective';
    maxConnections = 1;
    reason = 'dream_analysis';
  } else if (isFactual && isShortQuestion) {
    useUserMemory = true;
    useMemoryFacts = false;
    useConversationMemory = false;
    useDreamCoach = false;
    useLifeInsights = false;
    useTimeline = false;
    useRecentDreams = false;
    useRecentEmotions = false;
    useProactiveInsights = false;
    connectOldDream = false;
    allowInitiative = false;
    shouldAskFollowUp = false;
    responseDepth = 'short';
    responseTone = 'objective';
    maxConnections = 0;
    reason = 'factual_short';
  } else if (isFactual) {
    useUserMemory = true;
    useMemoryFacts = true;
    useConversationMemory = false;
    useDreamCoach = false;
    useLifeInsights = false;
    useTimeline = false;
    useRecentDreams = false;
    useRecentEmotions = false;
    useProactiveInsights = false;
    connectOldDream = false;
    allowInitiative = false;
    shouldAskFollowUp = false;
    responseDepth = likesObjective ? 'short' : 'medium';
    responseTone = 'objective';
    maxConnections = 0;
    reason = 'factual';
  } else if (isEvolution) {
    useUserMemory = true;
    useMemoryFacts = true;
    useConversationMemory = true;
    useDreamCoach = true;
    useLifeInsights = true;
    useTimeline = true;
    useRecentDreams = true;
    useRecentEmotions = true;
    useProactiveInsights = true;
    connectOldDream = true;
    allowInitiative = false;
    shouldAskFollowUp = true;
    responseDepth = 'deep';
    responseTone = 'reflective';
    maxConnections = 2;
    reason = 'evolution';
  } else if (isEmotional || isPersonal || isEmotionalByContent) {
    useUserMemory = true;
    useMemoryFacts = true;
    useConversationMemory = true;
    useDreamCoach = true;
    useLifeInsights = true;
    useTimeline = false;
    useRecentDreams = false;
    useRecentEmotions = true;
    useProactiveInsights = true;
    connectOldDream = false;
    allowInitiative = initiative && initiative.shouldSuggest;
    shouldAskFollowUp = true;
    responseDepth = empathyLevel === 'high' ? 'deep' : 'medium';
    responseTone = mode === 'celebration' ? 'celebratory' : 'supportive';
    maxConnections = likesConnections ? 2 : 1;
    reason = 'emotional';
  } else if (isGreeting || isGeneralAnswer) {
    useUserMemory = false;
    useMemoryFacts = false;
    useConversationMemory = false;
    useDreamCoach = false;
    useLifeInsights = false;
    useTimeline = false;
    useRecentDreams = false;
    useRecentEmotions = false;
    useProactiveInsights = false;
    connectOldDream = false;
    allowInitiative = false;
    shouldAskFollowUp = false;
    responseDepth = 'short';
    responseTone = 'supportive';
    maxConnections = 0;
    reason = 'greeting_or_general';
  } else {
    useUserMemory = true;
    useMemoryFacts = true;
    useConversationMemory = context.conversationMemories && context.conversationMemories.length > 0;
    useDreamCoach = false;
    useLifeInsights = false;
    useTimeline = false;
    useRecentDreams = hasDreamPattern;
    useRecentEmotions = false;
    useProactiveInsights = false;
    connectOldDream = hasDreamPattern;
    allowInitiative = false;
    shouldAskFollowUp = false;
    responseDepth = responseStyle === 'detailed' ? 'deep' : 'medium';
    responseTone = 'supportive';
    maxConnections = 0;
    reason = 'default';
  }

  if (likesObjective && responseTone !== 'objective' && reason !== 'emotional') {
    maxConnections = Math.max(0, maxConnections - 1);
  }

  if (likesDreamAnalysis && useRecentDreams === false && hasDreamPattern) {
    useRecentDreams = true;
    useRecentEmotions = true;
    connectOldDream = true;
  }

  if (likesConnections && maxConnections < 2 && reason !== 'factual' && reason !== 'greeting_or_general') {
    if (!isEvolution) maxConnections = Math.min(maxConnections + 1, 2);
  }

  return {
    useUserMemory,
    useMemoryFacts,
    useConversationMemory,
    useDreamCoach,
    useLifeInsights,
    useTimeline,
    useRecentDreams,
    useRecentEmotions,
    useProactiveInsights,
    connectOldDream,
    allowInitiative,
    shouldAskFollowUp,
    responseDepth,
    responseTone,
    maxConnections,
    reason,
  };
}

module.exports = { decide };
