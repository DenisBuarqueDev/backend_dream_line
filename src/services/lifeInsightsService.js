const UserMemory = require('../models/UserMemory');
const MemoryFact = require('../models/MemoryFact');

function buildProfile(userMemory) {
  if (!userMemory) return null;
  return {
    dreamProfile: userMemory.profile?.dreamProfile || null,
    dreamScore: userMemory.profile?.dreamScore || null,
    confidence: userMemory.profile?.confidence ?? null,
    totalDreams: userMemory.stats?.totalDreams || 0,
    totalEmotions: userMemory.stats?.totalEmotions || 0,
    totalInterpretations: userMemory.stats?.totalInterpretations || 0,
    activeDays: userMemory.stats?.activeDays || 0,
    firstDreamDate: userMemory.stats?.firstDreamDate || null,
    lastDreamDate: userMemory.stats?.lastDreamDate || null,
  };
}

function buildStrengths(userMemory, memoryFacts) {
  const items = [];

  const sleepAvg = userMemory?.sono?.averageSleep ?? null;
  if (sleepAvg !== null && sleepAvg >= 7) items.push('Rotina de sono saudável');

  const sleepTrend = userMemory?.sono?.sleepTrend || {};
  if (sleepTrend['7d'] != null && sleepTrend['30d'] != null && sleepTrend['7d'] > sleepTrend['30d'] + 0.3) {
    items.push('Melhora recente na qualidade do sono');
  }

  const score = userMemory?.profile?.dreamScore?.score ?? null;
  if (score !== null && score >= 80) items.push('Excelente conexão com o mundo onírico');
  else if (score !== null && score >= 60) items.push('Boa conexão com o mundo onírico');

  const consistency = userMemory?.behavior?.consistencyScore ?? null;
  if (consistency !== null && consistency >= 70) items.push('Alta consistência nos registros');
  else if (consistency !== null && consistency >= 50) items.push('Consistência moderada nos registros');

  const emotionTrend = userMemory?.emotions?.emotionalTrend || {};
  if (emotionTrend['7d'] != null && emotionTrend['30d'] != null && emotionTrend['7d'] < emotionTrend['30d'] - 0.3) {
    items.push('Redução da intensidade emocional');
  }

  const distribution = userMemory?.emotions?.emotionDistribution || [];
  const positiveEmotions = distribution.filter(e =>
    ['alegria', 'calma', 'amor', 'gratidao', 'esperanca', 'tranquilidade'].includes(e.emotion)
  );
  if (positiveEmotions.length > 0 && positiveEmotions[0].percentage >= 30) {
    items.push('Predomínio de emoções positivas');
  }

  const avgIntensity = userMemory?.behavior?.averageEmotionIntensity ?? null;
  if (avgIntensity !== null && avgIntensity <= 4) items.push('Baixa intensidade emocional — bem-estar elevado');

  const totalDreams = userMemory?.stats?.totalDreams || 0;
  if (totalDreams >= 20) items.push('Grande volume de sonhos registrados');
  else if (totalDreams >= 10) items.push('Regularidade no registro de sonhos');

  if (userMemory?.stats?.activeDays >= 30) items.push('Mais de 30 dias de atividade na plataforma');

  const factCategories = [...new Set((memoryFacts || []).map(f => f.category))];
  if (factCategories.includes('Hábitos')) items.push('Desenvolvimento de novos hábitos');
  if (factCategories.includes('Objetivos')) items.push('Clareza em relação a objetivos pessoais');
  if (factCategories.includes('Espiritualidade')) items.push('Interesse e desenvolvimento espiritual');

  if (userMemory?.correlacoes?.strongestCorrelations && userMemory.correlacoes.strongestCorrelations.length > 0) {
    items.push('Capacidade de identificar correlações entre sonhos e emoções');
  }

  if (userMemory?.insights?.positiveHabits && userMemory.insights.positiveHabits.length > 0) {
    for (const h of userMemory.insights.positiveHabits.slice(0, 3)) {
      items.push(h);
    }
  }

  return items.length > 0 ? items : ['Ainda não há dados suficientes para identificar pontos fortes.'];
}

function buildAttentionPoints(userMemory) {
  const items = [];

  const sleepAvg = userMemory?.sono?.averageSleep ?? null;
  if (sleepAvg !== null && sleepAvg < 5) items.push('Qualidade do sono abaixo do ideal (menos de 5h)');
  else if (sleepAvg !== null && sleepAvg < 6) items.push('Sono abaixo do recomendado (menos de 6h)');

  const sleepTrend = userMemory?.sono?.sleepTrend || {};
  if (sleepTrend['7d'] != null && sleepTrend['30d'] != null && sleepTrend['7d'] < sleepTrend['30d'] - 0.5) {
    items.push('Queda na qualidade do sono nas últimas semanas');
  }

  const emotionTrend = userMemory?.emotions?.emotionalTrend || {};
  if (emotionTrend['7d'] != null && emotionTrend['30d'] != null && emotionTrend['7d'] > emotionTrend['30d'] + 0.5) {
    items.push('Aumento da intensidade emocional — possível estresse ou ansiedade');
  }

  const avgIntensity = userMemory?.behavior?.averageEmotionIntensity ?? null;
  if (avgIntensity !== null && avgIntensity >= 7) items.push('Emoções com intensidade elevada');

  const distribution = userMemory?.emotions?.emotionDistribution || [];
  const negativeEmotions = distribution.filter(e =>
    ['tristeza', 'ansiedade', 'medo', 'raiva'].includes(e.emotion) && e.percentage >= 20
  );
  for (const e of negativeEmotions) {
    items.push(`Presença recorrente de ${e.emotion} (${Math.round(e.percentage)}% dos registros)`);
  }

  if (userMemory?.correlacoes?.stressCategory) {
    items.push(`Sonhos da categoria "${userMemory.correlacoes.stressCategory}" associados a estresse`);
  }
  if (userMemory?.correlacoes?.anxietyCategory) {
    items.push(`Sonhos da categoria "${userMemory.correlacoes.anxietyCategory}" associados a ansiedade`);
  }

  if (userMemory?.stats?.totalDreams === 0) items.push('Nenhum sonho registrado ainda');
  if (userMemory?.stats?.totalEmotions === 0) items.push('Nenhuma emoção registrada ainda');

  const consistency = userMemory?.behavior?.consistencyScore ?? null;
  if (consistency !== null && consistency < 30 && (userMemory?.stats?.totalDreams || 0) > 0) {
    items.push('Baixa consistência nos registros');
  }

  return items.length > 0 ? items : ['Nenhum ponto de atenção identificado.'];
}

function buildHabits(userMemory, memoryFacts) {
  const items = [];

  const habitFacts = (memoryFacts || []).filter(f => f.category === 'Hábitos');
  for (const fact of habitFacts.slice(0, 5)) {
    items.push(fact.fact);
  }

  const sleepAvg = userMemory?.sono?.averageSleep ?? null;
  if (sleepAvg !== null) {
    if (sleepAvg >= 7) items.push('Dorme regularmente 7 horas ou mais por noite');
    else if (sleepAvg < 5) items.push('Dorme menos de 5 horas por noite');
    else items.push(`Média de sono de ${sleepAvg} horas por noite`);
  }

  const avgIntensity = userMemory?.behavior?.averageEmotionIntensity ?? null;
  if (avgIntensity !== null) {
    if (avgIntensity <= 4) items.push('Mantém equilíbrio emocional com baixa intensidade');
    else if (avgIntensity >= 7) items.push('Tendência a emoções de alta intensidade');
  }

  const consistency = userMemory?.behavior?.consistencyScore ?? null;
  if (consistency !== null) {
    if (consistency >= 70) items.push('Rotina consistente de registros');
    else if (consistency < 30 && (userMemory?.stats?.totalDreams || 0) > 0) items.push('Registros esporádicos — sem frequência definida');
  }

  const positiveHabits = userMemory?.insights?.positiveHabits || [];
  for (const h of positiveHabits) {
    if (!items.includes(h)) items.push(h);
  }

  return items.length > 0 ? items : ['Ainda não há dados suficientes para identificar hábitos.'];
}

function buildRecurringPatterns(userMemory) {
  const patterns = [];

  if (!userMemory?.dreams?.recurringPatterns) return patterns;

  const categories = ['tematicos', 'espirituais', 'biologicos', 'emocionais'];
  for (const cat of categories) {
    const list = userMemory.dreams.recurringPatterns[cat];
    if (list && list.length > 0) {
      const labelMap = {
        tematicos: 'Temáticos',
        espirituais: 'Espirituais',
        biologicos: 'Biológicos',
        emocionais: 'Emocionais',
      };
      for (const item of list.slice(0, 5)) {
        patterns.push({
          category: labelMap[cat] || cat,
          pattern: item.pattern || item,
          count: item.count || 1,
        });
      }
    }
  }

  if (userMemory.dreams?.predominantCategories && userMemory.dreams.predominantCategories.length > 0) {
    for (const pc of userMemory.dreams.predominantCategories.slice(0, 5)) {
      patterns.push({
        category: 'Categoria predominante',
        pattern: pc.category,
        count: Math.round(pc.percentage) + '%',
      });
    }
  }

  return patterns;
}

function buildEmotionalEvolution(userMemory) {
  const lines = [];

  const trend = userMemory?.emotions?.emotionalTrend || {};
  if (trend['7d'] != null && trend['30d'] != null) {
    if (trend['7d'] < trend['30d'] - 0.3) {
      lines.push('Sua intensidade emocional reduziu nas últimas semanas, indicando maior estabilidade.');
    } else if (trend['7d'] > trend['30d'] + 0.3) {
      lines.push('Sua intensidade emocional aumentou recentemente.');
    } else {
      lines.push('Suas emoções se mantiveram em um padrão consistente.');
    }
  }

  if (trend['30d'] != null && trend['90d'] != null) {
    if (trend['30d'] < trend['90d'] - 0.3) {
      lines.push('Comparado ao trimestre, sua intensidade emocional está em queda — evolução positiva.');
    }
  }

  const distribution = userMemory?.emotions?.emotionDistribution || [];
  if (distribution.length > 0) {
    const top = distribution.slice(0, 3).map(e =>
      `${e.emotion} (${Math.round(e.percentage)}%, intensidade ${(e.avgIntensity || 0).toFixed(1)})`
    );
    lines.push(`Emoções mais frequentes: ${top.join(', ')}.`);
  }

  const predominant = userMemory?.emotions?.predominantEmotion;
  if (predominant) {
    lines.push(`Emoção predominante: ${predominant}.`);
  }

  const avgIntensity = userMemory?.behavior?.averageEmotionIntensity ?? null;
  if (avgIntensity !== null) {
    if (avgIntensity <= 3) lines.push('Suas emoções são vividas de forma leve.');
    else if (avgIntensity <= 5) lines.push('Suas emoções têm intensidade moderada.');
    else if (avgIntensity <= 7) lines.push('Suas emoções tendem a ser intensas.');
    else lines.push('Suas emoções são frequentemente de alta intensidade.');
  }

  return lines.length > 0 ? lines : ['Ainda não há dados emocionais suficientes.'];
}

function buildSleepEvolution(userMemory) {
  const lines = [];

  const avg = userMemory?.sono?.averageSleep ?? null;
  if (avg !== null) {
    if (avg >= 7) lines.push(`Sua média de sono é de ${avg} horas por noite — dentro do recomendado.`);
    else if (avg >= 6) lines.push(`Sua média de sono é de ${avg} horas — próximo do ideal.`);
    else if (avg >= 5) lines.push(`Sua média de sono é de ${avg} horas — abaixo do recomendado.`);
    else lines.push(`Sua média de sono é de ${avg} horas — bastante abaixo do ideal.`);
  }

  const trend = userMemory?.sono?.sleepTrend || {};
  if (trend['7d'] != null && trend['30d'] != null) {
    if (trend['7d'] > trend['30d'] + 0.3) {
      lines.push('Sua qualidade de sono melhorou nas últimas semanas.');
    } else if (trend['7d'] < trend['30d'] - 0.3) {
      lines.push('Sua qualidade de Sono reduziu ligeiramente nas últimas semanas.');
    } else {
      lines.push('Seu padrão de sono se manteve estável recentemente.');
    }
  }

  const bedTime = userMemory?.sono?.averageBedTime;
  const wakeTime = userMemory?.sono?.averageWakeTime;
  if (bedTime && wakeTime) {
    lines.push(`Horário médio de dormir: ${bedTime}. Acordar: ${wakeTime}.`);
  } else if (bedTime) {
    lines.push(`Horário médio de dormir: ${bedTime}.`);
  }

  return lines.length > 0 ? lines : ['Ainda não há dados de sono suficientes.'];
}

function buildAchievements(userMemory) {
  const items = [];

  const totalDreams = userMemory?.stats?.totalDreams || 0;
  const totalEmotions = userMemory?.stats?.totalEmotions || 0;
  const activeDays = userMemory?.stats?.activeDays || 0;
  const score = userMemory?.profile?.dreamScore?.score ?? null;
  const consistency = userMemory?.behavior?.consistencyScore ?? null;

  if (totalDreams >= 1) items.push({ icon: '🌙', title: 'Primeiro sonho registrado', description: 'O início da sua jornada onírica.' });
  if (totalDreams >= 10) items.push({ icon: '📓', title: '10 sonhos registrados', description: 'Você já construiu um diário de sonhos significativo.' });
  if (totalDreams >= 30) items.push({ icon: '🌟', title: '30 sonhos registrados', description: 'Seu mundo onírico está cada vez mais mapeado.' });
  if (totalDreams >= 50) items.push({ icon: '🏆', title: '50 sonhos registrados', description: 'Você é um verdadeiro explorador dos sonhos!' });

  if (totalEmotions >= 1) items.push({ icon: '❤️', title: 'Primeira emoção registrada', description: 'Você começou a mapear sua vida emocional.' });
  if (totalEmotions >= 10) items.push({ icon: '📊', title: '10 emoções registradas', description: 'Seu diário emocional já revela padrões.' });
  if (totalEmotions >= 30) items.push({ icon: '🧠', title: '30 emoções registradas', description: 'Grande volume de dados emocionais para analisar.' });

  if (activeDays >= 7) items.push({ icon: '📅', title: '1 semana de atividade', description: 'Você usou o Dream Line por pelo menos 7 dias.' });
  if (activeDays >= 30) items.push({ icon: '🗓️', title: '1 mês de atividade', description: 'Um mês inteiro explorando seus sonhos e emoções.' });
  if (activeDays >= 90) items.push({ icon: '🎉', title: '3 meses de atividade', description: 'Consistência de longo prazo — impressionante!' });

  if (score !== null && score >= 80) items.push({ icon: '💎', title: 'Dream Score de elite', description: 'Seu Dream Score ultrapassou 80 pontos.' });
  else if (score !== null && score >= 50) items.push({ icon: '📈', title: 'Dream Score em crescimento', description: `Seu Dream Score chegou a ${score} pontos.` });

  if (consistency !== null && consistency >= 70) items.push({ icon: '🔥', title: 'Alta consistência', description: 'Você mantém uma rotina exemplar de registros.' });

  if (userMemory?.stats?.totalInterpretations >= 10) items.push({ icon: '🔮', title: '10 interpretações', description: 'Você buscou entender 10 sonhos em profundidade.' });

  return items.length > 0 ? items : [{ icon: '🚀', title: 'Jornada começando', description: 'Cada registro é uma conquista. Continue!' }];
}

function buildRecommendations(userMemory, memoryFacts) {
  const recs = [];

  if (userMemory?.insights?.recommendations && userMemory.insights.recommendations.length > 0) {
    for (const r of userMemory.insights.recommendations.slice(0, 4)) {
      recs.push(r.title || r.description);
    }
  }

  const sleepAvg = userMemory?.sono?.averageSleep ?? null;
  if (sleepAvg !== null && sleepAvg < 6) recs.push('Tente estabelecer uma rotina de sono mais regular');
  if (sleepAvg !== null && sleepAvg < 5) recs.push('Considere consultar um especialista se a dificuldade para dormir persistir');

  const avgIntensity = userMemory?.behavior?.averageEmotionIntensity ?? null;
  if (avgIntensity !== null && avgIntensity >= 7) recs.push('Explore técnicas de relaxamento para equilibrar suas emoções');

  const totalD = userMemory?.stats?.totalDreams || 0;
  const totalE = userMemory?.stats?.totalEmotions || 0;
  if (totalD === 0) recs.push('Comece registrando seu primeiro sonho');
  if (totalE === 0) recs.push('Registre suas emoções para descobrir padrões emocionais');

  if (totalD >= 3 && totalE >= 3) {
    recs.push('Explore as correlações entre seus sonhos e emoções');
  }

  if (totalD < 5) recs.push('Mantenha um diário ao lado da cama para registrar sonhos ao acordar');

  if (userMemory?.correlacoes?.stressCategory) {
    recs.push(`Preste atenção aos sonhos da categoria "${userMemory.correlacoes.stressCategory}" — podem refletir estresse`);
  }

  return [...new Set(recs)].slice(0, 6);
}

function buildMotivation(userMemory) {
  const totalDreams = userMemory?.stats?.totalDreams || 0;
  const totalEmotions = userMemory?.stats?.totalEmotions || 0;
  const total = totalDreams + totalEmotions;
  const score = userMemory?.profile?.dreamScore?.score ?? null;
  const consistency = userMemory?.behavior?.consistencyScore ?? null;

  if (total === 0) return 'Comece registrando seu primeiro sonho ou emoção — cada pequeno passo importa.';
  if (total === 1) return 'Primeiro registro! Você deu o passo mais importante. O universo dos sonhos está se abrindo para você.';
  if (total <= 3) return 'Seus primeiros registros já estão criando uma base para o autoconhecimento. Continue!';
  if (total <= 10) return 'Você está construindo seu diário onírico. Em breve padrões vão surgir.';
  if (total <= 20) return 'Seus registros estão revelando um universo interior rico e cheio de significado.';
  if (total <= 30) return 'Sua jornada de autoconhecimento já tem consistência. Continue explorando!';

  if (consistency !== null && consistency >= 70) {
    return 'Sua disciplina em registrar é admirável. O autoconhecimento é uma jornada, e você está no caminho certo.';
  }
  if (score !== null && score >= 80) {
    return 'Sua sintonia com o mundo onírico é excepcional. Continue aprofundando essa conexão única.';
  }
  if (total <= 50) return 'Você já percorreu um longo caminho. Seu diário é um tesouro de autoconhecimento.';
  return 'Você construiu um diário rico em autoconhecimento. Seu futuro eu agradece.';
}

async function generateLifeInsights(userId) {
  const [userMemory, memoryFacts] = await Promise.all([
    UserMemory.findOne({ userId }).lean(),
    MemoryFact.find({ userId, isActive: true })
      .sort({ importanceScore: -1 })
      .limit(50)
      .select('category fact importanceScore firstSeen lastSeen')
      .lean(),
  ]);

  const strengths = buildStrengths(userMemory, memoryFacts);
  const attentionPoints = buildAttentionPoints(userMemory);
  const habits = buildHabits(userMemory, memoryFacts);
  const recurringPatterns = buildRecurringPatterns(userMemory);
  const emotionalEvolution = buildEmotionalEvolution(userMemory);
  const sleepEvolution = buildSleepEvolution(userMemory);
  const achievements = buildAchievements(userMemory);
  const recommendations = buildRecommendations(userMemory, memoryFacts);

  return {
    profile: buildProfile(userMemory),
    strengths,
    attentionPoints,
    habits,
    recurringPatterns,
    emotionalEvolution,
    sleepEvolution,
    achievements,
    recommendations,
    motivation: buildMotivation(userMemory),
  };
}

module.exports = { generateLifeInsights };
