function classifyResponse(question, context) {
  const q = question.toLowerCase().trim();
  const hasHistory = context.longTermMemory && context.longTermMemory.length > 0;
  const hasDreamCoach = context.dreamCoach !== null && context.dreamCoach !== undefined;
  const hasTimeline = context.timeline && context.timeline.length > 0;
  const hasLifeInsights = context.lifeInsights !== null && context.lifeInsights !== undefined;
  const hasDreams = context.recentDreams && context.recentDreams.length > 0;
  const hasEmotions = context.recentEmotions && context.recentEmotions.length > 0;

  const isDreamRelated = /sonhei|sonh[oa]|sonhar|pesadelo|interpreta[çc][ãa]o|s[ií]mbolo|sonhos.*recorrente|categoria.*sonh|padr[ãa]o.*sonho/i.test(q);
  const isEmotional = /ansios[ao]|estressado|triste|feliz|emocionalmente|sentind[oae]|emoç[ãa]o|humor|deprimid[ao]|angustiado|irritad[ao]|calm[oa]|preocupad[ao]|medo|raiva|estou me (sentindo|sinto)/i.test(q);
  const isPersonal = /voc[êe] (sabe|lembra|conhece)|lembra (que|da)|(eu )?(j[aá]|ja) (te|lhe) (contei|falei|disse)|voc[êe] lembra|n[ãa]o sei se voc[êe] sabe/i.test(q);
  const isEvolution = /evolu[çc][ãa]o|evoluind[oa]|melhorei|piorei|estou melhor|estou pior|mud[oa]u|progresso|melhor[oa]ndo|pior[oa]ndo|como (eu )?estou|o que mudou|diferen[çc]a/i.test(q);
  const isFactual = /quantas? horas? (eu )?durmo|qual (a )?minha média (de )?sono|quantos sonhos (eu )?tive|qual (o )?meu (score|status)|quantas? vezes|estatísticas?|dados? (do )?(meu )?(sono|sonho)|média (de )?(sono|emoção)/i.test(q);
  const isInterpretation = /o que significa (sonhar|ter)/i.test(q);
  const isSleep = /sono|dormir|dormi|ins[oô]nia|acordei/i.test(q) && !isDreamRelated;
  const isMotivation = /motiv[aç]ão|incentiv[oa]|encorajar|força|ânimo|foco/i.test(q);
  const isGuidance = /como melhorar|o que fazer|conselho|dica|devo|deveria|preciso/i.test(q);
  const isReflection = /o que voc[êe] acha|o que pensa|refletir|auto conhecimento|significa/i.test(q);
  const isComparison = /diferen[çc]a|comparad[oa]|enquanto antes|antes vs/i.test(q);

  let responseType = 'reflection';
  if (isPersonal) responseType = 'personal_question';
  else if (isDreamRelated && isInterpretation) responseType = 'interpretation';
  else if (isDreamRelated) responseType = 'dream_analysis';
  else if (isEmotional && (isEvolution || isGuidance)) responseType = 'guidance';
  else if (isEmotional) responseType = 'emotional_support';
  else if (isFactual || isSleep) responseType = 'factual_question';
  else if (isEvolution) responseType = 'comparison';
  else if (isMotivation) responseType = 'motivation';
  else if (isGuidance) responseType = 'guidance';
  else if (isComparison) responseType = 'comparison';
  else if (isSleep) responseType = 'sleep';
  else if (isInterpretation) responseType = 'interpretation';
  else if (isReflection) responseType = 'reflection';

  let emotionalTone = 'neutral';
  const negativePattern = /ansios[ao]|estressado|triste|deprimid[ao]|angustiado|irritad[ao]|preocupad[ao]|medo|raiva|dif[íi]cil|cansad[ao]/i;
  const positivePattern = /feliz|alegre|grato|realizado|calm[oa]/i;
  const growthPattern = /evolu[çc][ãa]o|melhorei|progresso|aprendi|superei|conquistei|avan[çc]o/i;

  if (positivePattern.test(q) || (isEvolution && growthPattern.test(q))) {
    emotionalTone = 'celebratory';
  } else if (negativePattern.test(q)) {
    emotionalTone = 'supportive';
  } else if (isEvolution || isComparison || isDreamRelated) {
    emotionalTone = 'analytical';
  } else if (isGuidance || isMotivation) {
    emotionalTone = 'encouraging';
  } else if (isFactual || isSleep) {
    emotionalTone = 'calm';
  }

  let answerStyle = 'medium';
  const shortPattern = /^(sim|n[aã]o|ok|obrigado|tchau|oi|ol[aá])$/i;
  if (shortPattern.test(q.trim())) {
    answerStyle = 'short';
  } else if (isEvolution || isReflection || isEmotional || isGuidance || isPersonal) {
    answerStyle = 'detailed';
  }

  let primaryTopic = '';
  let secondaryTopic = '';
  if (isDreamRelated) {
    primaryTopic = 'sonhos';
    secondaryTopic = isInterpretation ? 'significado' : 'análise';
  } else if (isEmotional) {
    primaryTopic = 'emoções';
    secondaryTopic = isEvolution ? 'evolução' : 'bem-estar';
  } else if (isPersonal) {
    primaryTopic = 'memória pessoal';
  } else if (isFactual) {
    primaryTopic = q.includes('sono') || q.includes('dorm') ? 'sono' : 'dados';
  } else if (isEvolution) {
    primaryTopic = 'evolução';
    secondaryTopic = q.includes('sono') ? 'sono' : 'emocional';
  } else if (isSleep) {
    primaryTopic = 'sono';
  } else if (isGuidance) {
    primaryTopic = 'orientação';
  } else if (isMotivation) {
    primaryTopic = 'motivação';
  } else if (isReflection) {
    primaryTopic = 'reflexão';
  } else {
    primaryTopic = 'geral';
  }

  const shouldUseDreamCoach = hasDreamCoach && (isEvolution || isGuidance || (isEmotional && isEvolution));
  const shouldUseTimeline = hasTimeline && (isEvolution || isComparison || (isDreamRelated && isInterpretation));
  const shouldUseLifeInsights = hasLifeInsights && (isEvolution || (isEmotional && isEvolution) || isGuidance);
  const shouldUseMemoryFacts = hasHistory && (isPersonal || (isEmotional && !isEvolution));
  const shouldUseRecentDreams = hasDreams && (isDreamRelated || (isEmotional && isEvolution));
  const shouldUseRecentEmotions = hasEmotions && (isEmotional || (isDreamRelated && isEvolution));
  const shouldRecallPastConversation = hasHistory && (isPersonal || isReflection);

  return {
    responseType,
    primaryTopic,
    secondaryTopic,
    shouldUseDreamCoach,
    shouldUseTimeline,
    shouldUseLifeInsights,
    shouldUseMemoryFacts,
    shouldUseRecentDreams,
    shouldUseRecentEmotions,
    shouldRecallPastConversation,
    emotionalTone,
    answerStyle,
  };
}

function buildPlanBlock(plan) {
  const useList = [];
  const ignoreList = [];

  if (plan.shouldUseRecentDreams) useList.push('Sonhos recentes');
  else ignoreList.push('Sonhos recentes');
  if (plan.shouldUseRecentEmotions) useList.push('Emoções recentes');
  else ignoreList.push('Emoções recentes');
  if (plan.shouldUseDreamCoach) useList.push('Dream Coach');
  else ignoreList.push('Dream Coach');
  if (plan.shouldUseTimeline) useList.push('Timeline');
  else ignoreList.push('Timeline');
  if (plan.shouldUseLifeInsights) useList.push('Life Insights');
  else ignoreList.push('Life Insights');
  if (plan.shouldUseMemoryFacts) useList.push('Memória pessoal');
  else ignoreList.push('Memória pessoal');
  if (plan.shouldRecallPastConversation) useList.push('Conversas anteriores');

  let block = '## PLANO DA RESPOSTA\n\n';
  block += `Foco principal: ${plan.primaryTopic}\n`;
  if (plan.secondaryTopic) block += `Foco secundário: ${plan.secondaryTopic}\n`;
  block += `Tipo de resposta: ${plan.responseType}\n`;
  block += `Tom: ${plan.emotionalTone}\n`;
  block += `Estilo: ${plan.answerStyle}\n`;
  if (useList.length > 0) block += `Dados para utilizar: ${useList.join(', ')}\n`;
  if (ignoreList.length > 0) block += `Dados para ignorar: ${ignoreList.join(', ')}\n`;
  block += '\nSiga este plano ao responder. Não utilize dados marcados para ignorar.';
  return block;
}

module.exports = { classifyResponse, buildPlanBlock };
