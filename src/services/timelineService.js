const Dream = require('../models/Dream');
const EmotionJournal = require('../models/EmotionJournal');
const UserMemory = require('../models/UserMemory');
const MemoryFact = require('../models/MemoryFact');

const EVENT_TYPES = {
  SONHO_REGISTRADO: 'sonho_registrado',
  SONHO_INTERPRETADO: 'sonho_interpretado',
  EMOCAO_REGISTRADA: 'emocao_registrada',
  PADRAO_IDENTIFICADO: 'padrao_identificado',
  MELHORA_SONO: 'melhora_sono',
  PIORA_SONO: 'piora_sono',
  MELHORA_EMOCIONAL: 'melhora_emocional',
  AUMENTO_INTENSIDADE: 'aumento_intensidade',
  CORRELACAO_DESCOBERTA: 'correlacao_descoberta',
  CONQUISTA: 'conquista',
  EVOLUCAO_POSITIVA: 'evolucao_positiva',
  ALERTA_IMPORTANTE: 'alerta_importante',
  RECOMENDACAO: 'recomendacao',
  NOVO_PADRAO: 'novo_padrao',
  MARCO: 'marco',
};

function truncate(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function buildDreamEvents(dreams) {
  const events = [];
  for (const d of dreams) {
    events.push({
      date: d.createdAt,
      type: EVENT_TYPES.SONHO_REGISTRADO,
      title: 'Sonho registrado',
      description: truncate(d.textoSonho, 120),
      importance: 50,
      category: d.dreamCategory || 'Outros',
      icon: 'dream',
      color: '#8B5CF6',
    });

    if (d.interpretacao) {
      events.push({
        date: d.createdAt,
        type: EVENT_TYPES.SONHO_INTERPRETADO,
        title: 'Sonho interpretado',
        description: truncate(d.interpretacao, 120),
        importance: 60,
        category: d.dreamCategory || 'Outros',
        icon: 'interpretation',
        color: '#A855F7',
      });
    }
  }
  return events;
}

function buildEmotionEvents(emotions) {
  const events = [];
  for (const e of emotions) {
    events.push({
      date: e.createdAt,
      type: EVENT_TYPES.EMOCAO_REGISTRADA,
      title: `Emoção registrada: ${e.emotion}`,
      description: `Intensidade ${e.intensity}/10${e.causes?.length ? ' — ' + e.causes.join(', ') : ''}`,
      importance: Math.min(e.intensity * 10, 80),
      category: e.emotion,
      icon: 'emotion',
      color: e.intensity >= 7 ? '#EF4444' : e.intensity >= 4 ? '#F59E0B' : '#10B981',
    });
  }
  return events;
}

function buildIntelligentEvents(userMemory, memoryFacts) {
  const events = [];

  if (!userMemory) return events;

  const sleepTrend = userMemory.sono?.sleepTrend || {};
  const emotionTrend = userMemory.emotions?.emotionalTrend || {};
  const score = userMemory.profile?.dreamScore?.score ?? null;
  const consistency = userMemory.behavior?.consistencyScore ?? null;
  const avgIntensity = userMemory.behavior?.averageEmotionIntensity ?? null;
  const activeDays = userMemory.stats?.activeDays || 0;
  const totalDreams = userMemory.stats?.totalDreams || 0;
  const totalEmotions = userMemory.stats?.totalEmotions || 0;
  const baseDate = userMemory.lastCalculation || userMemory.lastUpdated || new Date();

  if (sleepTrend['7d'] != null && sleepTrend['30d'] != null) {
    if (sleepTrend['7d'] > sleepTrend['30d'] + 0.3) {
      events.push({
        date: baseDate,
        type: EVENT_TYPES.MELHORA_SONO,
        title: 'Qualidade do sono melhorou',
        description: 'Você passou a dormir melhor nas últimas semanas comparado ao mês anterior.',
        importance: 70,
        category: 'Sono',
        icon: 'sleep_improve',
        color: '#10B981',
      });
    } else if (sleepTrend['7d'] < sleepTrend['30d'] - 0.5) {
      events.push({
        date: baseDate,
        type: EVENT_TYPES.PIORA_SONO,
        title: 'Alerta: qualidade do sono',
        description: 'Sua qualidade de sono reduziu nas últimas semanas. Vale acompanhar de perto.',
        importance: 80,
        category: 'Sono',
        icon: 'sleep_warning',
        color: '#EF4444',
      });
    }
  }

  if (emotionTrend['7d'] != null && emotionTrend['30d'] != null) {
    if (emotionTrend['7d'] < emotionTrend['30d'] - 0.3) {
      events.push({
        date: baseDate,
        type: EVENT_TYPES.MELHORA_EMOCIONAL,
        title: 'Intensidade emocional reduziu',
        description: 'Suas emoções estão mais equilibradas — sinal de maior estabilidade emocional.',
        importance: 75,
        category: 'Emoções',
        icon: 'emotion_improve',
        color: '#10B981',
      });
    } else if (emotionTrend['7d'] > emotionTrend['30d'] + 0.5) {
      events.push({
        date: baseDate,
        type: EVENT_TYPES.AUMENTO_INTENSIDADE,
        title: 'Alerta: intensidade emocional',
        description: 'Suas emoções estão mais intensas que o habitual. Considere práticas de relaxamento.',
        importance: 80,
        category: 'Emoções',
        icon: 'emotion_warning',
        color: '#EF4444',
      });
    }
  }

  if (score !== null && score >= 80) {
    events.push({
      date: baseDate,
      type: EVENT_TYPES.CONQUISTA,
      title: 'Dream Score de elite!',
      description: 'Seu Dream Score ultrapassou 80 — você está em sintonia com seus sonhos.',
      importance: 90,
      category: 'Conquista',
      icon: 'trophy',
      color: '#FFD700',
    });
  } else if (score !== null && score >= 50 && score < 80) {
    events.push({
      date: baseDate,
      type: EVENT_TYPES.EVOLUCAO_POSITIVA,
      title: 'Dream Score em desenvolvimento',
      description: `Seu Dream Score atual é ${score}. Continue registrando para evoluir.`,
      importance: 60,
      category: 'Evolução',
      icon: 'trending_up',
      color: '#8B5CF6',
    });
  }

  if (consistency !== null && consistency >= 70) {
    events.push({
      date: baseDate,
      type: EVENT_TYPES.CONQUISTA,
      title: 'Alta consistência nos registros',
      description: 'Você mantém uma rotina regular de registros — isso é essencial para o autoconhecimento.',
      importance: 70,
      category: 'Conquista',
      icon: 'streak',
      color: '#FFD700',
    });
  }

  if (activeDays >= 7 && totalDreams >= 7) {
    events.push({
      date: baseDate,
      type: EVENT_TYPES.MARCO,
      title: 'Uma semana de sonhos',
      description: 'Você registrou sonhos durante pelo menos 7 dias — que consistência!',
      importance: 75,
      category: 'Marco',
      icon: 'calendar_check',
      color: '#FFD700',
    });
  }

  if (userMemory.dreams?.recurringPatterns) {
    const patterns = userMemory.dreams.recurringPatterns;
    const allPatterns = [];
    for (const key of ['tematicos', 'espirituais', 'biologicos', 'emocionais']) {
      if (patterns[key] && patterns[key].length > 0) {
        allPatterns.push(...patterns[key]);
      }
    }
    if (allPatterns.length > 0) {
      events.push({
        date: baseDate,
        type: EVENT_TYPES.PADRAO_IDENTIFICADO,
        title: 'Padrões recorrentes identificados',
        description: `${allPatterns.length} padrão(ões) encontrado(s) nos seus sonhos: ${allPatterns.slice(0, 3).map(p => p.pattern || p).join(', ')}.`,
        importance: 65,
        category: 'Padrões',
        icon: 'pattern',
        color: '#3B82F6',
      });
    }
  }

  if (userMemory.correlacoes?.strongestCorrelations && userMemory.correlacoes.strongestCorrelations.length > 0) {
    for (const corr of userMemory.correlacoes.strongestCorrelations.slice(0, 2)) {
      events.push({
        date: baseDate,
        type: EVENT_TYPES.CORRELACAO_DESCOBERTA,
        title: 'Correlação descoberta',
        description: `Nova correlação entre "${corr.emotion}" e sonhos da categoria "${corr.category}" (probabilidade: ${Math.round(corr.probability * 100)}%).`,
        importance: 70,
        category: 'Correlações',
        icon: 'correlation',
        color: '#EC4899',
      });
    }
  }

  if (avgIntensity !== null && avgIntensity >= 7) {
    events.push({
      date: baseDate,
      type: EVENT_TYPES.ALERTA_IMPORTANTE,
      title: 'Alerta: emoções intensas',
      description: 'A intensidade média das suas emoções está elevada. Práticas de relaxamento podem ajudar.',
      importance: 80,
      category: 'Alerta',
      icon: 'alert',
      color: '#EF4444',
    });
  }

  if (avgIntensity !== null && avgIntensity <= 4 && totalEmotions >= 3) {
    events.push({
      date: baseDate,
      type: EVENT_TYPES.EVOLUCAO_POSITIVA,
      title: 'Emoções leves e equilibradas',
      description: 'Suas emoções têm se mantido em baixa intensidade — sinal de bem-estar emocional.',
      importance: 70,
      category: 'Evolução',
      icon: 'peace',
      color: '#10B981',
    });
  }

  const factCategories = [...new Set((memoryFacts || []).filter(f => f.isActive !== false).map(f => f.category))];
  if (factCategories.includes('Hábitos')) {
    events.push({
      date: baseDate,
      type: EVENT_TYPES.NOVO_PADRAO,
      title: 'Novos hábitos em desenvolvimento',
      description: 'Seus padrões indicam desenvolvimento de novos hábitos. Continue assim!',
      importance: 60,
      category: 'Hábitos',
      icon: 'habit',
      color: '#F59E0B',
    });
  }
  if (factCategories.includes('Objetivos')) {
    events.push({
      date: baseDate,
      type: EVENT_TYPES.EVOLUCAO_POSITIVA,
      title: 'Objetivos pessoais em foco',
      description: 'Seus objetivos estão cada vez mais claros com base nos seus registros.',
      importance: 65,
      category: 'Evolução',
      icon: 'target',
      color: '#8B5CF6',
    });
  }

  for (const fact of (memoryFacts || [])) {
    if (fact.importanceScore >= 80 && fact.lastSeen) {
      events.push({
        date: fact.lastSeen,
        type: EVENT_TYPES.RECOMENDACAO,
        title: `Fato importante: ${fact.category}`,
        description: fact.fact,
        importance: fact.importanceScore,
        category: fact.category,
        icon: 'fact',
        color: '#6366F1',
      });
    }
  }

  if (userMemory.insights?.recommendations && userMemory.insights.recommendations.length > 0) {
    for (const rec of userMemory.insights.recommendations.slice(0, 2)) {
      events.push({
        date: baseDate,
        type: EVENT_TYPES.RECOMENDACAO,
        title: rec.title || 'Recomendação',
        description: rec.description || rec.title || '',
        importance: rec.priority === 'high' ? 80 : 60,
        category: 'Recomendação',
        icon: 'bulb',
        color: '#FFD700',
      });
    }
  }

  if (userMemory.insights?.warnings && userMemory.insights.warnings.length > 0) {
    for (const w of userMemory.insights.warnings.slice(0, 2)) {
      events.push({
        date: baseDate,
        type: EVENT_TYPES.ALERTA_IMPORTANTE,
        title: 'Alerta dos seus insights',
        description: w,
        importance: 75,
        category: 'Alerta',
        icon: 'warning',
        color: '#EF4444',
      });
    }
  }

  if (totalDreams >= 1 && userMemory.stats?.firstDreamDate) {
    events.push({
      date: userMemory.stats.firstDreamDate,
      type: EVENT_TYPES.MARCO,
      title: 'Primeiro sonho registrado',
      description: 'Você registrou seu primeiro sonho no Dream Line. O começo de uma jornada!',
      importance: 90,
      category: 'Marco',
      icon: 'first_dream',
      color: '#FFD700',
    });
  }

  if (totalEmotions >= 1) {
    const emotionStart = userMemory.lastUpdated || userMemory.lastCalculation || new Date();
    events.push({
      date: new Date(emotionStart.getTime() - totalEmotions * 86400000),
      type: EVENT_TYPES.MARCO,
      title: 'Primeira emoção registrada',
      description: 'Você registrou sua primeira emoção. Autoconhecimento emocional em ação!',
      importance: 85,
      category: 'Marco',
      icon: 'first_emotion',
      color: '#EC4899',
    });
  }

  return events;
}

function deduplicateEvents(events) {
  const seen = new Set();
  return events.filter(e => {
    const key = `${e.type}|${e.title}|${new Date(e.date).toISOString().slice(0, 10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function generateTimeline(userId) {
  const [dreams, emotions, userMemory, memoryFacts] = await Promise.all([
    Dream.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('textoSonho interpretacao dreamCategory categorias createdAt')
      .lean(),
    EmotionJournal.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('emotion intensity causes createdAt')
      .lean(),
    UserMemory.findOne({ userId }).lean(),
    MemoryFact.find({ userId, isActive: true })
      .sort({ importanceScore: -1 })
      .limit(30)
      .select('category fact importanceScore firstSeen lastSeen')
      .lean(),
  ]);

  let events = [];

  events.push(...buildDreamEvents(dreams));
  events.push(...buildEmotionEvents(emotions));
  events.push(...buildIntelligentEvents(userMemory, memoryFacts));

  events = deduplicateEvents(events);

  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  return events;
}

module.exports = { generateTimeline };
