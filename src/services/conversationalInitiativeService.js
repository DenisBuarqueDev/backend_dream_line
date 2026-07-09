const TOPIC_PATTERNS = {
  sono: /cansado|cansaço|dormir|insônia?|acordei|acordar|noite|sono|cama|deitar/i,
  saude: /m[eé]dico|doen[cç]a|terapia|tratamento|dor|exame|consulta|hospital|rem[eé]dio/i,
  projeto: /criar|desenvolver|aplicativo|startup|neg[oó]cio|projeto|lan[cç]ar|app/i,
  emocao: /ansiedade|estresse|tristeza|medo|preocupad[ao]|ansios[ao]|depress[aã]o|ang[uú]stia|raiva|frustra[cç][ãa]o/i,
  habito: /medita[cç][ãa]o|exerc[ií]cio|yoga|academia|caminhada|correr|ler|leitura|h[áa]bito|rotina/i,
  trabalho: /trabalho|emprego|carreira|reuni[ãa]o|chefe|colega|promo[cç][ãa]o|demiss[aã]o|profissional/i,
  familia: /filh[oa]|m[ãa]e|pai|irm[ãa]o|fam[ií]lia|relacionamento|casamento|namor[ao]|espos[ao]/i,
  sonho: /sonh[oa]|pesadelo|sonhei|pesadelos/i,
  objetivo: /objetivo|meta|plano|prop[oó]sito|sonho.*realizar|realizar.*sonho/i,
  produtividade: /produtivo|produtividade|foco|concentra[cç][ãa]o|rendimento|desempenho/i,
};

const TRIVIAL_QUESTION = [
  /^(oi|ol[áa]|tudo bem|bom dia|boa tarde|boa noite)/i,
  /^(obrigad[ao]|valeu|brigado)/i,
  /^(sim|n[ãa]o|talvez|ok|okay|t[áa]|okay|joia)/i,
  /^(tchau|at[eé] logo|flw|fui|at[eé] mais)/i,
  /^(que horas s[ãa]o|que dia [eé] hoje|hoje [eé] que dia|qual a data)/i,
  /^(qual [eé] o significado|como funciona|o que [eé])/i,
  /^(teste|testing|ol[aá] mundo|hello world)/i,
];

const TECHNICAL_PATTERNS = [
  /como (?:fazer|criar|instalar|configurar|usar|resolver)/i,
  /qual [eé] a diferen[cç]a/i,
  /por que (?:meu sonho|minha emo[cç][ãa]o)/i,
  /o que significa (?:sonhar|ter um sonho)/i,
  /(?:erro|bug|problema t[eé]cnico)/i,
];

const EMOTION_KEYWORDS = {
  ansiedade: /ansiedade|ansios[ao]|preocupa[cç][ãa]o|nervos[ao]/i,
  tristeza: /triste|tristeza|deprimid[ao]|desanimad[ao]|baixo astral/i,
  estresse: /estresse|estressad[ao]|sobrecarregad[ao]|press[aã]o/i,
  medo: /medo|assustad[ao]|apreensivo|inseguran[cç]a/i,
  raiva: /raiva|irritad[ao]|chatead[ao]|aborrecid[ao]/i,
  alegria: /feliz|alegre|contente|realizad[ao]|grato|motivad[ao]/i,
};

function isTrivial(question) {
  const q = question.trim();
  if (q.split(/\s+/).length <= 2) return true;
  for (const p of TRIVIAL_QUESTION) {
    if (p.test(q)) return true;
  }
  return false;
}

function isTechnical(question) {
  for (const p of TECHNICAL_PATTERNS) {
    if (p.test(question)) return true;
  }
  return false;
}

function matchQuestionToTopics(question) {
  const matched = [];
  for (const [type, pattern] of Object.entries(TOPIC_PATTERNS)) {
    if (pattern.test(question)) {
      matched.push(type);
    }
  }
  return matched;
}

function checkEmotionalMatch(question) {
  for (const [type, pattern] of Object.entries(EMOTION_KEYWORDS)) {
    if (pattern.test(question)) return type;
  }
  return null;
}

function buildSuggestionForMemory(memory, question) {
  const topic = memory.topic;
  const qLower = question.toLowerCase();

  if (memory.status !== 'active') return null;

  let prefix = '';
  if (/como|evolu[ií]ndo|andando|continuando|novidades/i.test(qLower)) {
    prefix = 'Lembrei que você mencionou';
  } else if (/cansad[ao]|dif[ií]cil|complicad[ao]/i.test(qLower)) {
    prefix = 'Na última vez conversamos sobre';
  } else {
    prefix = 'Você comentou antes sobre';
  }

  return {
    suggestion: `${prefix} ${topic}. Como isso tem evoluído?`,
    priority: memory.importance === 'high' ? 'high' : 'medium',
  };
}

function buildSuggestionForHabit(habit, question) {
  const qLower = question.toLowerCase();
  if (/conseguiu|manter|rotina|h[áa]bito|disciplina/i.test(qLower)) {
    return {
      suggestion: `E a sua rotina de ${habit.toLowerCase()}? Você tem conseguido manter?`,
      priority: 'medium',
    };
  }
  if (/acordei|cedo|produtivo|bem|disposto/i.test(qLower)) {
    return {
      suggestion: `Você conseguiu manter também sua rotina de ${habit.toLowerCase()}?`,
      priority: 'medium',
    };
  }
  return null;
}

function buildSuggestionForEmotion(emotionType, question) {
  const suggestions = {
    ansiedade: 'Da última vez conversamos sobre sua ansiedade. Como você tem se sentido desde então?',
    tristeza: 'Lembro que você passou por um momento difícil. Como tem se sentido ultimamente?',
    estresse: 'Na última vez falamos sobre o estresse que você estava enfrentando. Como as coisas estão agora?',
    medo: 'Você mencionou alguns medos antes. Como isso tem se desenrolado?',
    raiva: 'Lembro que teve uma situação que te incomodou bastante. Isso se resolveu?',
    alegria: 'Que bom ver você se sentindo bem! Isso me lembra que você vinha evoluindo bastante na sua jornada.',
  };
  const suggestion = suggestions[emotionType];
  if (!suggestion) return null;

  const qLower = question.toLowerCase();
  if (/bem|melhor|feliz|alegre|contente|positivo/i.test(qLower) && (emotionType === 'ansiedade' || emotionType === 'tristeza' || emotionType === 'estresse' || emotionType === 'medo')) {
    return {
      suggestion: `Fico feliz em perceber isso. Você sente que sua ${emotionType} diminuiu nos últimos dias?`,
      priority: 'high',
    };
  }

  return {
    suggestion,
    priority: 'high',
  };
}

function buildSuggestionForProject(projectTopic, question) {
  const qLower = question.toLowerCase();
  if (/produtivo|trabalhei|avancei|andei|fiz|projeto|como est[áa]/i.test(qLower)) {
    return {
      suggestion: `E o ${projectTopic}? Como está andando?`,
      priority: 'high',
    };
  }
  return null;
}

function buildSuggestionForGoal(goalTopic, question) {
  const qLower = question.toLowerCase();
  if (/como|dica|ajuda|melhorar|conselho|sugest[aã]o/i.test(qLower)) {
    return {
      suggestion: `Na última vez conversamos sobre seu objetivo de ${goalTopic.toLowerCase()}. Como isso tem evoluído?`,
      priority: 'high',
    };
  }
  if (/cansad[ao]|dormir|dif[ií]cil|complicado|n[aã]o t[o] conseguindo/i.test(qLower)) {
    return {
      suggestion: `Lembrei do seu objetivo de ${goalTopic.toLowerCase()}. Como você está se sentindo em relação a isso?`,
      priority: 'high',
    };
  }
  return {
    suggestion: `Você mencionou o objetivo de ${goalTopic.toLowerCase()}. Como tem sido?`,
    priority: 'medium',
  };
}

function evaluate(question, context) {
  const result = {
    shouldSuggest: false,
    priority: 'low',
    suggestion: null,
    reason: '',
  };

  if (!question || typeof question !== 'string') return result;
  if (isTrivial(question)) {
    result.reason = 'Pergunta trivial';
    return result;
  }
  if (isTechnical(question)) {
    result.reason = 'Pergunta técnica';
    return result;
  }

  const matchedTypes = matchQuestionToTopics(question);
  const convMemories = (context.conversationMemories || []).filter(m => m.status === 'active');
  const longTermMemory = context.longTermMemory || [];
  const proactiveInsights = context.proactiveInsights || [];
  const habits = context.positiveHabits || [];

  const hasEmotionalQuestion = checkEmotionalMatch(question);

  let candidates = [];

  for (const mem of convMemories) {
    const topic = mem.topic.toLowerCase();
    const memType = inferTopicType(mem.topic, question);

    let relevance = 0;
    if (hasEmotionalQuestion && (memType === 'emoções' || memType === 'emocional')) relevance = 3;
    if (matchedTypes.includes('sono') && memType === 'sono') relevance = 3;
    if (matchedTypes.includes('projeto') && memType === 'projeto') relevance = 3;
    if (matchedTypes.includes('objetivo') && memType === 'objetivos') relevance = 3;
    if (matchedTypes.includes('saúde') && memType === 'saúde') relevance = 3;
    if (matchedTypes.includes('hábito') && memType === 'hábitos') relevance = 3;
    if (matchedTypes.includes('trabalho') && memType === 'trabalho') relevance = 3;
    if (matchedTypes.includes('família') && memType === 'família') relevance = 3;

    if (relevance === 0 && matchedTypes.length > 0) {
      for (const mt of matchedTypes) {
        if (topic.includes(mt)) relevance = 2;
      }
    }

    if (relevance > 0) {
      const imp = mem.importance === 'high' ? 3 : mem.importance === 'medium' ? 2 : 1;
      const recency = mem.lastMention ? (Date.now() - new Date(mem.lastMention).getTime()) / (1000 * 60 * 60 * 24) : 999;
      const daysScore = recency < 7 ? 3 : recency < 30 ? 2 : recency < 90 ? 1 : 0;
      candidates.push({ source: 'conversationMemory', memory: mem, score: relevance + imp + daysScore, type: memType });
    }
  }

  if (candidates.length === 0 && hasEmotionalQuestion) {
    const emotionMemories = convMemories.filter(m => {
      const t = m.topic.toLowerCase();
      return /ansiedade|tristeza|estresse|medo|raiva|emo[cç][ãa]o/i.test(t);
    });
    if (emotionMemories.length > 0) {
      const best = emotionMemories.sort((a, b) => {
        const impA = a.importance === 'high' ? 3 : a.importance === 'medium' ? 2 : 1;
        const impB = b.importance === 'high' ? 3 : b.importance === 'medium' ? 2 : 1;
        return impB - impA;
      })[0];
      const sug = buildSuggestionForEmotion(hasEmotionalQuestion, question);
      if (sug) {
        result.shouldSuggest = true;
        result.priority = sug.priority;
        result.suggestion = sug.suggestion;
        result.reason = `Match emocional com memória: ${best.topic}`;
        return result;
      }
    }
  }

  if (candidates.length === 0) {
    for (const insight of proactiveInsights) {
      const insType = insight.category || '';
      let relevance = 0;
      if (matchedTypes.includes(insType)) relevance = 2;
      if (hasEmotionalQuestion && (insType === 'emoções' || insType === 'emocional')) relevance = 2;
      if (matchedTypes.includes('sono') && insType === 'sono') relevance = 2;

      if (relevance > 0) {
        const impPriority = insight.priority === 'critical' ? 4 : insight.priority === 'high' ? 3 : insight.priority === 'medium' ? 2 : 1;
        candidates.push({
          source: 'proactiveInsight',
          insight,
          score: relevance + impPriority,
          type: insType,
        });
      }
    }
  }

  if (candidates.length === 0) {
    for (const fact of longTermMemory) {
      if (!fact.isActive) continue;
      const factType = (fact.category || '').toLowerCase();
      let relevance = 0;
      for (const mt of matchedTypes) {
        if (factType.includes(mt)) relevance = 2;
      }
      if (hasEmotionalQuestion && (factType === 'emoções' || factType === 'emocional')) relevance = 2;
      if (matchedTypes.includes('sono') && factType === 'sono') relevance = 2;

      if (relevance > 0) {
        candidates.push({
          source: 'memoryFact',
          fact,
          score: relevance + Math.floor(fact.importanceScore / 30),
          type: factType,
        });
      }
    }
  }

  if (candidates.length === 0) {
    const emotionName = hasEmotionalQuestion;
    if (emotionName) {
      const sug = buildSuggestionForEmotion(emotionName, question);
      if (sug) {
        result.shouldSuggest = true;
        result.priority = sug.priority;
        result.suggestion = sug.suggestion;
        result.reason = `Match emocional na pergunta: ${emotionName}`;
        return result;
      }
    }
  }

  if (candidates.length === 0) {
    if (habits.length > 0) {
      for (const habit of habits) {
        const sug = buildSuggestionForHabit(habit, question);
        if (sug) {
          result.shouldSuggest = true;
          result.priority = sug.priority;
          result.suggestion = sug.suggestion;
          result.reason = `Match hábito: ${habit}`;
          return result;
        }
      }
    }
  }

  if (candidates.length === 0) {
    result.reason = 'Nenhuma oportunidade natural encontrada';
    return result;
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  let suggestion = null;

  if (best.source === 'conversationMemory') {
    const memSug = buildSuggestionForMemory(best.memory, question);
    if (memSug) {
      suggestion = memSug;
    } else if (best.type === 'projeto') {
      suggestion = buildSuggestionForProject(best.memory.topic, question);
    } else if (best.type === 'objetivos') {
      suggestion = buildSuggestionForGoal(best.memory.topic, question);
    } else if (best.type === 'emoções' || best.type === 'emocional') {
      suggestion = buildSuggestionForEmotion(hasEmotionalQuestion || 'ansiedade', question);
    }

    if (!suggestion) {
      suggestion = {
        suggestion: `Você comentou antes sobre ${best.memory.topic}. Como tem sido?`,
        priority: best.memory.importance === 'high' ? 'high' : 'medium',
      };
    }
  } else if (best.source === 'proactiveInsight') {
    suggestion = {
      priority: best.insight.priority === 'critical' ? 'high' : best.insight.priority,
      suggestion: `Lembrei que notei algo interessante: ${best.insight.title}. Você tem percebido isso também?`,
    };
  } else if (best.source === 'memoryFact') {
    suggestion = {
      priority: best.fact.importanceScore >= 70 ? 'high' : 'medium',
      suggestion: `Lembrei que você mencionou sobre ${best.fact.fact.toLowerCase()}. Como isso está agora?`,
    };
  }

  if (suggestion) {
    result.shouldSuggest = true;
    result.priority = suggestion.priority;
    result.suggestion = suggestion.suggestion;
    result.reason = `${best.source}: ${best.type || best.memory?.topic || ''}`;
  } else {
    result.reason = 'Nenhuma sugestão adequada gerada';
  }

  return result;
}

function inferTopicType(topic, question) {
  const q = question ? question.toLowerCase() : '';
  const t = topic.toLowerCase();
  if (/sono|dormir|ins[oô]nia|acordar|sono/i.test(q) || /sono|dormir|ins[oô]nia/i.test(t)) return 'sono';
  if (/sonh[oa]|pesadelo|sonhei/i.test(q) || /sonh[oa]|pesadelo/i.test(t)) return 'sonhos';
  if (/ansios[ao]|estresse|triste|depress[aã]o|emo[cç][ãa]o|ansiedade|medo|raiva/i.test(q) || /ansiedade|tristeza|emo[cç][ãa]o/i.test(t)) return 'emoções';
  if (/trabalho|emprego|carreira|profiss[aã]o/i.test(q) || /trabalho|profissional|carreira/i.test(t)) return 'trabalho';
  if (/fam[ií]lia|filh[oa]|pai|m[ãe]e|irm[aã]o|casamento|relacionamento/i.test(q) || /fam[ií]lia|relacionamento|casamento/i.test(t)) return 'família';
  if (/sa[úu]de|m[eé]dico|doen[cç]a|terapia|tratamento/i.test(q) || /sa[úu]de|terapia|tratamento/i.test(t)) return 'saúde';
  if (/exerc[ií]cio|academia|yoga|medita[cç][ãa]o|caminhada|h[áa]bito|correr|ler/i.test(q) || /h[áa]bito|medita[cç][ãa]o|exerc[ií]cio/i.test(t)) return 'hábitos';
  if (/criar|desenvolver|projeto|aplicativo|app|startup/i.test(q) || /projeto|app|aplicativo/i.test(t)) return 'projeto';
  if (/objetivo|meta|plano|prop[oó]sito/i.test(q) || /objetivo|meta/i.test(t)) return 'objetivos';
  return 'geral';
}

module.exports = { evaluate };
