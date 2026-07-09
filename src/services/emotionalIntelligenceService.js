const EMOTIONS = {
  CALM: 'calm',
  HAPPY: 'happy',
  EXCITED: 'excited',
  GRATEFUL: 'grateful',
  ANXIOUS: 'anxious',
  STRESSED: 'stressed',
  SAD: 'sad',
  FRUSTRATED: 'frustrated',
  ANGRY: 'angry',
  FEARFUL: 'fearful',
  CONFUSED: 'confused',
  REFLECTIVE: 'reflective',
  NEUTRAL: 'neutral',
};

const MODES = {
  SUPPORT: 'support',
  COACHING: 'coaching',
  CELEBRATION: 'celebration',
  REFLECTION: 'reflection',
  CURIOSITY: 'curiosity',
  OBJECTIVE: 'objective',
};

function detectEmotion(question, plan, context) {
  const q = question.toLowerCase().trim();
  const planType = plan ? plan.responseType : '';
  const planTone = plan ? plan.emotionalTone : '';

  if (/grato|agraced[eo]|obrigad[ao]|feliz.*[aá]|que bom|que alegria/i.test(q)) {
    return { emotion: EMOTIONS.GRATEFUL, intensity: 'medium', mode: MODES.CELEBRATION };
  }

  if (/ansios[ao]/i.test(q) && /muito|bastante|demais|extremamente|t[oa]/.test(q)) {
    return { emotion: EMOTIONS.ANXIOUS, intensity: 'high', mode: MODES.SUPPORT };
  }
  if (/ansios[ao]/i.test(q)) {
    return { emotion: EMOTIONS.ANXIOUS, intensity: 'medium', mode: MODES.SUPPORT };
  }

  if (/estressado|sobrecarregado|n[ãa]o dou conta|muita press[ãa]o/i.test(q)) {
    return { emotion: EMOTIONS.STRESSED, intensity: 'high', mode: MODES.SUPPORT };
  }

  if (/triste|deprimid[ao]|melanc[oó]lico|desanimado|desmotivado|sem vontade|chor[aei]/i.test(q)) {
    const intense = /muito|bastante|demais|extremamente|t[oa]/.test(q);
    return { emotion: EMOTIONS.SAD, intensity: intense ? 'high' : 'medium', mode: MODES.SUPPORT };
  }

  if (/frustrado|irritado|nervoso|chateado|aborrecido/i.test(q)) {
    return { emotion: EMOTIONS.FRUSTRATED, intensity: 'medium', mode: MODES.SUPPORT };
  }

  if (/com raiva|put[oa]|bravo|enfurecido/i.test(q)) {
    return { emotion: EMOTIONS.ANGRY, intensity: 'high', mode: MODES.SUPPORT };
  }

  if (/medo|com medo|assustad[ao]|apreensivo|preocupa[çc][ãa]o/i.test(q)) {
    return { emotion: EMOTIONS.FEARFUL, intensity: 'medium', mode: MODES.SUPPORT };
  }

  if (/confuso|n[ãa]o entend[oi]|n[ãa]o sei|sem entender|dif[ií]cil entender/i.test(q)) {
    return { emotion: EMOTIONS.CONFUSED, intensity: 'low', mode: MODES.CURIOSITY };
  }

  if (/feliz|alegre|contente|satisfeito|realizado|conquistei|consegui|venci|sucesso/i.test(q)) {
    const intense = /muito|bastante|super|extremamente|t[oa]/.test(q);
    return { emotion: EMOTIONS.HAPPY, intensity: intense ? 'high' : 'medium', mode: MODES.CELEBRATION };
  }

  if (/animado|empolgado|motivado|ansioso[^s]|expectativa|ansiedade.*(boa|positiva)/i.test(q)) {
    return { emotion: EMOTIONS.EXCITED, intensity: 'high', mode: MODES.CELEBRATION };
  }

  if (/calm[oa]|tranquilo|paciente|zen|relaxado|sereno/i.test(q)) {
    return { emotion: EMOTIONS.CALM, intensity: 'low', mode: MODES.REFLECTION };
  }

  if (/refletir|pensar|reflita|auto conhecimento|significa[d)]|interpreta[çc][ãa]o/i.test(q)) {
    return { emotion: EMOTIONS.REFLECTIVE, intensity: 'low', mode: MODES.REFLECTION };
  }

  if (planType === 'factual_question' || planType === 'objective') {
    return { emotion: EMOTIONS.NEUTRAL, intensity: 'low', mode: MODES.OBJECTIVE };
  }

  if (planType === 'dream_analysis' || planType === 'interpretation') {
    return { emotion: EMOTIONS.REFLECTIVE, intensity: 'low', mode: MODES.CURIOSITY };
  }

  if (planType === 'comparison' || planTone === 'analytical') {
    return { emotion: EMOTIONS.REFLECTIVE, intensity: 'medium', mode: MODES.REFLECTION };
  }

  if (planType === 'personal_question') {
    return { emotion: EMOTIONS.REFLECTIVE, intensity: 'medium', mode: MODES.COACHING };
  }

  if (planType === 'guidance') {
    return { emotion: EMOTIONS.REFLECTIVE, intensity: 'medium', mode: MODES.COACHING };
  }

  return { emotion: EMOTIONS.NEUTRAL, intensity: 'low', mode: MODES.REFLECTION };
}

function buildResponseOpening(emotion, intensity, mode) {
  const openings = {
    [EMOTIONS.HAPPY]: [
      'Fico feliz em ouvir isso!',
      'Que bom, fico feliz por você!',
      'Isso é ótimo!',
    ],
    [EMOTIONS.EXCITED]: [
      'Que legal!',
      'Isso é animador!',
    ],
    [EMOTIONS.GRATEFUL]: [
      'Que bom que isso te traz gratidão.',
      'É lindo ver esse sentimento.',
    ],
    [EMOTIONS.ANXIOUS]: {
      high: [
        'Sinto que isso está pesando para você.',
        'Imagino que isso esteja sendo difícil.',
      ],
      medium: [
        'Entendo que isso possa gerar ansiedade.',
        'Percebo sua preocupação.',
      ],
    },
    [EMOTIONS.STRESSED]: [
      'Parece que tem muita coisa acontecendo.',
      'Isso soa realmente desgastante.',
    ],
    [EMOTIONS.SAD]: {
      high: [
        'Sinto muito que você esteja se sentindo assim.',
        'Quero que saiba que pode contar comigo.',
      ],
      medium: [
        'Entendo como isso deve ser difícil.',
        'Percebo que isso te afetou.',
      ],
    },
    [EMOTIONS.FRUSTRATED]: [
      'Entendo sua frustração.',
      'Percebo que isso te incomodou.',
    ],
    [EMOTIONS.ANGRY]: [
      'Entendo. Vamos respirar um momento.',
      'Percebo que isso te afetou bastante.',
    ],
    [EMOTIONS.FEARFUL]: [
      'Entendo seu receio.',
      'Isso realmente pode gerar apreensão.',
    ],
    [EMOTIONS.CONFUSED]: [
      'Vamos entender juntos.',
      'Ótima pergunta.',
    ],
    [EMOTIONS.CALM]: [
      'Que bom que você está em paz.',
      'É ótimo ver essa tranquilidade.',
    ],
    [EMOTIONS.REFLECTIVE]: [
      'Vamos analisar juntos.',
      'Isso é algo realmente interessante para refletir.',
    ],
    [EMOTIONS.NEUTRAL]: [
      'Entendi.',
      'Nesse caso...',
    ],
  };

  const list = openings[emotion];
  if (!list) return 'Entendi.';

  if (Array.isArray(list)) {
    return list[Math.floor(Math.random() * list.length)];
  }

  if (typeof list === 'object') {
    const sub = list[intensity] || list.medium || list.high;
    if (Array.isArray(sub)) {
      return sub[Math.floor(Math.random() * sub.length)];
    }
  }

  return 'Entendi.';
}

function analyze(question, plan, context) {
  const { emotion, intensity, mode } = detectEmotion(question, plan, context);

  const isNegative = [EMOTIONS.ANXIOUS, EMOTIONS.STRESSED, EMOTIONS.SAD, EMOTIONS.FRUSTRATED, EMOTIONS.ANGRY, EMOTIONS.FEARFUL].includes(emotion);
  const isPositive = [EMOTIONS.HAPPY, EMOTIONS.EXCITED, EMOTIONS.GRATEFUL, EMOTIONS.CALM].includes(emotion);

  const empathyLevel = isNegative ? 'high' : (mode === MODES.SUPPORT ? 'medium' : 'low');
  const shouldCelebrate = isPositive && intensity !== 'low';
  const shouldEncourage = isNegative || mode === MODES.COACHING;
  const shouldAskQuestion = mode === MODES.CURIOSITY || mode === MODES.COACHING;
  const shouldAvoidAnalysis = isNegative && intensity === 'high';
  const shouldBeObjective = mode === MODES.OBJECTIVE;

  const responseOpening = buildResponseOpening(emotion, intensity, mode);

  return {
    detectedEmotion: emotion,
    emotionalIntensity: intensity,
    conversationMode: mode,
    empathyLevel,
    responseOpening,
    shouldCelebrate,
    shouldEncourage,
    shouldAskQuestion,
    shouldAvoidAnalysis,
    shouldBeObjective,
  };
}

function buildEmotionBlock(state) {
  let block = '## ESTADO EMOCIONAL ATUAL\n\n';
  block += `Emoção detectada: ${state.detectedEmotion}\n`;
  block += `Intensidade: ${state.emotionalIntensity}\n`;
  block += `Modo de conversa: ${state.conversationMode}\n`;
  block += `Nível de empatia: ${state.empathyLevel}\n`;
  block += `Abertura: "${state.responseOpening}"\n`;
  block += `${state.shouldCelebrate ? 'Celebrar: sim\n' : ''}`;
  block += `${state.shouldEncourage ? 'Incentivar: sim\n' : ''}`;
  block += `${state.shouldAskQuestion ? 'Convidar reflexão: sim\n' : ''}`;
  if (state.shouldAvoidAnalysis) block += 'Evitar análises longas: sim\n';
  if (state.shouldBeObjective) block += 'Tom objetivo: sim\n';
  block += '\nUse estas informações para adaptar o tom da sua resposta. Não mencione este bloco ao usuário.';
  return block;
}

module.exports = { analyze, buildEmotionBlock };
