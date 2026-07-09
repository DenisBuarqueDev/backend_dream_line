const mongoose = require('mongoose');
const Dream = require('../models/Dream');
const EmotionJournal = require('../models/EmotionJournal');
const User = require('../models/User');
const analyticsService = require('./analyticsService');
const insightService = require('./insightService');
const dashboardService = require('./dashboardService');

const POSITIVE_EMOTIONS = ['alegria', 'calma', 'amor', 'gratidao', 'esperanca', 'tranquilidade'];
const NEGATIVE_EMOTIONS = ['tristeza', 'ansiedade', 'medo', 'raiva', 'nojinho', 'vergonha', 'culpa'];

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function determineDreamerProfile(analytics, dreamData, emotionData) {
  const { dreams, emotions } = analytics;
  const patterns = dreams.patterns || {};
  const totalDreams = dreams.total || 0;
  const totalEmotions = emotions.total || 0;
  const hasInterpretation = dreamData?.totalInterpretations || 0;
  const interpPct = totalDreams > 0 ? (hasInterpretation / totalDreams) * 100 : 0;

  const emotionalPatternCount = (patterns.emocionais || []).length;
  const spiritualPatternCount = (patterns.espirituais || []).length;
  const categoryCount = (dreams.categories || []).length;
  const positivePct = calculatePositivePct(analytics);

  let type = 'Sonhador Explorador';
  let confidence = 0.7;
  let characteristics = ['Mente aberta', 'Curiosidade natural'];

  if (totalDreams === 0 && totalEmotions === 0) {
    type = 'Sonhador Iniciante';
    confidence = 0.5;
    characteristics = ['Primeiros passos', 'Potencial a ser descoberto'];
  } else if (emotionalPatternCount >= 3 && totalEmotions > totalDreams) {
    type = 'Sonhador Emocional';
    confidence = 0.85;
    characteristics = ['Sensibilidade apurada', 'Conexão com sentimentos', 'Introspecção profunda'];
  } else if (spiritualPatternCount >= 3 || (dreams.categories || []).some(c => c.category === 'Morte')) {
    type = 'Sonhador Espiritual';
    confidence = 0.8;
    characteristics = ['Busca de significado', 'Conexão transcendental', 'Sabedoria interior'];
  } else if (interpPct >= 50 && positivePct >= 50) {
    type = 'Sonhador Racional';
    confidence = 0.82;
    characteristics = ['Mente analítica', 'Autoconhecimento', 'Equilíbrio emocional'];
  } else if (categoryCount >= 4) {
    type = 'Sonhador Explorador';
    confidence = 0.78;
    characteristics = ['Mente criativa', 'Diversidade de experiências', 'Adaptabilidade'];
  } else if (positivePct < 40 && emotionalPatternCount > 0) {
    type = 'Sonhador Sensível';
    confidence = 0.75;
    characteristics = ['Percepção aguçada', 'Processamento emocional intenso', 'Empatia'];
  }

  const profileTexts = {
    'Sonhador Emocional': 'Seus sonhos são fortemente influenciados pelo seu estado emocional. Você tende a processar sentimentos profundos através das experiências oníricas, com uma capacidade natural de acessar camadas emocionais que muitos ignoram.',
    'Sonhador Racional': 'Você aborda seus sonhos com uma mente analítica e curiosa. Busca compreender os significados por trás das imagens e tende a encontrar padrões lógicos mesmo no mundo onírico.',
    'Sonhador Intuitivo': 'Sua intuição é uma bússola poderosa. Os sonhos funcionam como um radar natural, captando energias e mensagens sutis que sua mente consciente processa de forma criativa.',
    'Sonhador Explorador': 'Sua mente é um universo em expansão. Você sonha com temas variados e está sempre aberto a novas experiências oníricas, explorando diferentes aspectos do inconsciente.',
    'Sonhador Espiritual': 'Seus sonhos transcendem o plano material. Há uma busca constante por significado espiritual e conexão com algo maior, refletida em símbolos de transformação e renovação.',
    'Sonhador Sensível': 'Você possui uma sensibilidade incomum que se reflete nos sonhos. As experiências oníricas são intensas e carregadas de emoção, funcionando como um termômetro do seu bem-estar interior.',
    'Sonhador Iniciante': 'Você está começando sua jornada de autoconhecimento através dos sonhos. Cada novo registro é um passo importante para descobrir o universo que existe dentro de você.',
  };

  const description = profileTexts[type] || profileTexts['Sonhador Explorador'];

  return { type, description, confidence, characteristics };
}

function calculatePositivePct(analytics) {
  const dist = analytics.emotions.distribution || [];
  const total = dist.reduce((s, d) => s + d.count, 0);
  if (total === 0) return 50;
  const positive = dist.filter(d => POSITIVE_EMOTIONS.includes(d.emotion)).reduce((s, d) => s + d.count, 0);
  return Math.round((positive / total) * 100);
}

function calculateDreamScore(analytics) {
  const sleep = analytics.sleep || {};
  const dreams = analytics.dreams || {};
  const emotions = analytics.emotions || {};
  const totalDreams = dreams.total || 0;
  const totalEmotions = emotions.total || 0;

  // Sleep quality (max 30)
  let sleepScore = 0;
  if (sleep.avgSleepHours != null) {
    if (sleep.avgSleepHours >= 8) sleepScore = 30;
    else if (sleep.avgSleepHours >= 7) sleepScore = 25;
    else if (sleep.avgSleepHours >= 6) sleepScore = 18;
    else if (sleep.avgSleepHours >= 5) sleepScore = 10;
    else sleepScore = 5;
  }

  // Dream frequency (max 25)
  let dreamScore = 0;
  if (totalDreams >= 50) dreamScore = 25;
  else if (totalDreams >= 30) dreamScore = 22;
  else if (totalDreams >= 15) dreamScore = 18;
  else if (totalDreams >= 10) dreamScore = 14;
  else if (totalDreams >= 5) dreamScore = 10;
  else if (totalDreams >= 1) dreamScore = 5;

  // Emotional balance (max 20)
  let emotionScore = 0;
  if (totalEmotions > 0) {
    const positivePct = calculatePositivePct(analytics);
    if (positivePct >= 70) emotionScore = 20;
    else if (positivePct >= 50) emotionScore = 15;
    else if (positivePct >= 30) emotionScore = 10;
    else emotionScore = 5;
  }

  // Interpretation coverage (max 15)
  let interpScore = 0;
  const interpCount = (dreams.total || 0);
  // We don't have exact interpretation count here, use categories coverage as proxy
  if (totalDreams > 0) {
    const catCoverage = (dreams.categories || []).length;
    if (catCoverage >= 5) interpScore = 15;
    else if (catCoverage >= 3) interpScore = 10;
    else if (catCoverage >= 1) interpScore = 5;
  }

  // Sleep consistency (max 10)
  let consistencyScore = 0;
  if (sleep.avgBedTime != null && sleep.avgWakeTime != null) consistencyScore = 10;
  else if (sleep.avgBedTime != null || sleep.avgWakeTime != null) consistencyScore = 5;

  const total = sleepScore + dreamScore + emotionScore + interpScore + consistencyScore;
  const clamped = Math.max(0, Math.min(100, total));

  let label = 'Iniciante';
  if (clamped >= 80) label = 'Excepcional';
  else if (clamped >= 65) label = 'Avancado';
  else if (clamped >= 45) label = 'Intermediario';
  else if (clamped >= 25) label = 'Iniciante';

  return { score: clamped, label, components: { sleepScore, dreamScore, emotionScore, interpScore, consistencyScore } };
}

function determineEvolutionStatus(current, previous) {
  if (current == null || previous == null) return 'stable';
  if (current > previous * 1.05) return 'improving';
  if (current < previous * 0.95) return 'declining';
  return 'stable';
}

function determineEmotionalEvolution(analytics) {
  const emotions = analytics.emotions || {};
  const dist = emotions.distribution || [];
  const total = dist.reduce((s, d) => s + d.count, 0);
  if (total === 0) return { trend: 'stable', status: 'stable', analysis: 'Não há dados emocionais suficientes para análise de evolução.' };

  const positivePct = calculatePositivePct(analytics);
  const trend7d = emotions.intensityTrend?.['7d'];
  const trend365d = emotions.intensityTrend?.['365d'];
  const status = determineEvolutionStatus(trend7d, trend365d);

  let analysis = '';
  if (positivePct >= 60) {
    analysis = `Sua composição emocional é predominantemente positiva (${positivePct}% das emoções registradas). `;
  } else if (positivePct >= 40) {
    analysis = `Suas emoções apresentam um equilíbrio entre positivas (${positivePct}%) e negativas. `;
  } else {
    analysis = `Suas emoções têm uma tendência mais negativa (${positivePct}% positivas). `;
  }

  if (status === 'improving') {
    analysis += 'A intensidade emocional tem reduzido, indicando maior estabilidade.';
  } else if (status === 'declining') {
    analysis += 'A intensidade emocional tem aumentado, sugerindo períodos mais intensos.';
  } else {
    analysis += 'A intensidade emocional tem se mantido estável.';
  }

  return { trend: status === 'improving' ? 'melhora' : status === 'declining' ? 'piora' : 'estavel', status, analysis, positivePct };
}

function determineDreamEvolution(analytics) {
  const dreams = analytics.dreams || {};
  const total = dreams.total || 0;
  if (total === 0) return { trend: 'stable', status: 'stable', analysis: 'Não há dados de sonhos suficientes para análise de evolução.' };

  const months = dreams.perMonth || [];
  const recent = months.filter(m => m.year === new Date().getFullYear());
  const currentCount = recent.length > 0 ? recent[0].count : 0;
  const previousCount = recent.length > 1 ? recent[1].count : 0;
  const status = determineEvolutionStatus(currentCount, previousCount);

  const topCat = dreams.mostFrequentCategory || 'variadas';
  let analysis = `Você registrou ${total} sonhos no total. `;
  analysis += `A categoria mais frequente é "${topCat}". `;

  if (status === 'improving') {
    analysis += 'A frequência de registros tem aumentado, mostrando maior engajamento com seus sonhos.';
  } else if (status === 'declining') {
    analysis += 'A frequência de registros tem diminuído. Tente manter uma rotina regular de registro.';
  } else {
    analysis += 'A frequência de registros tem se mantido consistente.';
  }

  return { trend: status === 'improving' ? 'crescimento' : status === 'declining' ? 'reducao' : 'estavel', status, analysis, total };
}

function determineSleepEvolution(analytics) {
  const sleep = analytics.sleep || {};
  if (sleep.avgSleepHours == null) return { trend: 'stable', status: 'stable', analysis: 'Não há dados de sono suficientes para análise de evolução.' };

  const trend7d = sleep.trend?.['7d'];
  const trend365d = sleep.trend?.['365d'];
  const status = determineEvolutionStatus(trend7d, trend365d);

  let analysis = `Sua média de sono é de ${sleep.avgSleepHours}h por noite. `;
  if (sleep.avgBedTime) analysis += `Você geralmente dorme às ${sleep.avgBedTime} `;
  if (sleep.avgWakeTime) analysis += `e acorda às ${sleep.avgWakeTime}. `;

  if (sleep.avgSleepHours >= 7) analysis += 'Sua duração de sono está dentro do ideal. ';
  else if (sleep.avgSleepHours >= 6) analysis += 'Sua duração de sono está próxima do ideal. ';
  else analysis += 'Sua duração de sono está abaixo do recomendado. ';

  if (status === 'improving') {
    analysis += 'A qualidade do seu sono tem melhorado.';
  } else if (status === 'declining') {
    analysis += 'Sua qualidade de sono tem reduzido.';
  } else {
    analysis += 'Seu padrão de sono tem se mantido consistente.';
  }

  return { trend: status === 'improving' ? 'melhora' : status === 'declining' ? 'piora' : 'estavel', status, analysis, avgHours: sleep.avgSleepHours };
}

function generatePatterns(analytics, intelligence) {
  const patterns = [];
  const dreams = analytics.dreams || {};
  const emotions = analytics.emotions || {};
  const correlations = analytics.correlations || {};

  // From intelligence
  if (intelligence?.patterns) {
    for (const p of intelligence.patterns) {
      patterns.push(p);
    }
  }

  // From correlations
  if (correlations.predominantEmotionByCategory) {
    for (const c of correlations.predominantEmotionByCategory.slice(0, 3)) {
      patterns.push(`Sonhos de "${c.category}" estão frequentemente associados à emoção "${capitalize(c.emotion)}" (${c.probability}% das ocorrências).`);
    }
  }

  // From dream patterns
  const allPatterns = dreams.patterns || {};
  for (const [type, items] of Object.entries(allPatterns)) {
    for (const item of items.slice(0, 3)) {
      const typeLabel = { tematicos: 'Temático', espirituais: 'Espiritual', biologicos: 'Biológico', emocionais: 'Emocional' }[type] || type;
      patterns.push(`Padrão ${typeLabel}: "${capitalize(item.pattern)}" aparece ${item.count} vez(es) nos seus sonhos.`);
    }
  }

  // Emotional patterns
  if (emotions.distribution) {
    const top = emotions.distribution[0];
    if (top) {
      patterns.push(`A emoção mais frequente é "${capitalize(top.emotion)}" (${top.count} registros, ${top.percentage}% do total).`);
    }
  }

  // Sleep-related patterns
  if (dreams.total > 0) {
    const bestDay = analytics.sleep?.bestDreamDay;
    const worstDay = analytics.sleep?.worstDreamDay;
    if (bestDay && worstDay && bestDay !== worstDay) {
      patterns.push(`Seus melhores registros de sonho ocorrem às ${bestDay}, enquanto os períodos mais parcos são às ${worstDay}.`);
    }
  }

  if (patterns.length === 0) {
    patterns.push('Registre mais sonhos e emoções para identificar padrões significativos.');
  }

  return patterns.slice(0, 12);
}

function generateRecommendations(analytics, intelligence) {
  const recommendations = [];
  const sleep = analytics.sleep || {};
  const emotions = analytics.emotions || {};
  const totalDreams = analytics.dreams?.total || 0;
  const totalEmotions = emotions.total || 0;
  const positivePct = calculatePositivePct(analytics);
  const dist = emotions.distribution || [];

  if (totalDreams === 0) {
    recommendations.push({
      priority: 'high',
      title: 'Registre seu primeiro sonho',
      description: 'Comece a registrar seus sonhos para receber insights personalizados e acompanhar padrões oníricos.',
    });
  } else if (totalDreams < 10) {
    recommendations.push({
      priority: 'medium',
      title: 'Aumente seus registros',
      description: 'Quanto mais sonhos você registrar, mais precisos serão os padrões e análises do relatório.',
    });
  } else {
    recommendations.push({
      priority: 'low',
      title: 'Mantenha a consistência',
      description: 'Continue registrando seus sonhos regularmente para enriquecer suas estatísticas e padrões.',
    });
  }

  if (totalEmotions === 0) {
    recommendations.push({
      priority: 'high',
      title: 'Registre suas emoções',
      description: 'O diário emocional permite correlacionar sentimentos com sonhos, revelando conexões profundas.',
    });
  } else if (totalEmotions < 10) {
    recommendations.push({
      priority: 'medium',
      title: 'Expanda seu diário emocional',
      description: 'Registre emoções diariamente para identificar gatilhos e padrões emocionais com mais clareza.',
    });
  } else {
    recommendations.push({
      priority: 'low',
      title: 'Continue monitorando emoções',
      description: 'Seu hábito de registrar emoções é valioso. Quanto mais dados, melhores as correlações com seus sonhos.',
    });
  }

  if (sleep.avgSleepHours != null && sleep.avgSleepHours < 6) {
    recommendations.push({
      priority: 'high',
      title: 'Melhore sua qualidade de sono',
      description: `Sua média de ${sleep.avgSleepHours}h está abaixo do ideal. Tente estabelecer uma rotina noturna consistente, evitando telas antes de dormir.`,
    });
  } else if (sleep.avgSleepHours != null && sleep.avgSleepHours < 7) {
    recommendations.push({
      priority: 'medium',
      title: 'Aumente suas horas de sono',
      description: `Dormir ${sleep.avgSleepHours}h por noite é um bom começo. Tente chegar perto das 8 horas para um descanso ideal.`,
    });
  }

  if (totalEmotions >= 5) {
    const negativeCount = dist.filter(d => NEGATIVE_EMOTIONS.includes(d.emotion)).reduce((s, d) => s + d.count, 0);
    const negativePct = (negativeCount / totalEmotions) * 100;
    if (negativePct > 60) {
      recommendations.push({
        priority: 'high',
        title: 'Equilíbrio emocional',
        description: 'Suas emoções negativas predominam. Experimente meditação, exercícios físicos ou converse com alguém de confiança.',
      });
    } else if (negativePct > 40) {
      recommendations.push({
        priority: 'medium',
        title: 'Fortaleça emoções positivas',
        description: 'Busque atividades que tragam alegria e gratidão. Pequenas pausas para autocuidado fazem diferença.',
      });
    }
  }

  if (totalDreams >= 5 && totalEmotions >= 5) {
    recommendations.push({
      priority: 'medium',
      title: 'Explore correlações',
      description: 'Você já tem dados suficientes para explorar como suas emoções influenciam seus sonhos e vice-versa.',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      title: 'Continue registrando',
      description: 'Mantenha seus registros para receber recomendações cada vez mais personalizadas.',
    });
  }

  return recommendations;
}

function generateTrends(analytics, dreamEvolution, emotionalEvolution, sleepEvolution) {
  const trends = [];
  const sleep = analytics.sleep || {};
  const emotions = analytics.emotions || {};
  const dreams = analytics.dreams || {};

  // Emotional trend
  if (emotionalEvolution.status === 'improving') {
    trends.push('Tendência de melhora emocional — suas emoções estão mais equilibradas e positivas.');
  } else if (emotionalEvolution.status === 'declining') {
    trends.push('Atenção à tendência emocional — a intensidade negativa tem aumentado. Considere práticas de autocuidado.');
  } else {
    trends.push('Estabilidade emocional — suas emoções mantêm um padrão consistente.');
  }

  // Sleep trend
  const trend7d = sleep.trend?.['7d'];
  const trend30d = sleep.trend?.['30d'];
  if (trend7d != null && trend30d != null && trend7d > trend30d) {
    trends.push('Tendência de melhora na qualidade do sono — sua média recente está acima da geral.');
  } else if (trend7d != null && trend30d != null && trend7d < trend30d) {
    trends.push('Atenção ao sono — sua média recente está abaixo da geral. Tente regular sua rotina noturna.');
  } else if (sleep.avgSleepHours != null) {
    trends.push(`Sua média de sono de ${sleep.avgSleepHours}h por noite tende a se manter estável.`);
  }

  // Dream category trends
  const months = dreams.perMonth || [];
  if (months.length >= 2) {
    const catDistinct = (dreams.categories || []).length;
    if (catDistinct >= 3) {
      trends.push('Diversidade onírica — seus sonhos abrangem múltiplas categorias, indicando uma mente criativa e versátil.');
    }
  }

  // Correlation-based trends
  const correlations = analytics.correlations || {};
  if (correlations.mostPositiveCategory) {
    trends.push(`Categoria " ${correlations.mostPositiveCategory}" está associada às suas emoções mais positivas.`);
  }
  if (correlations.anxietyCategory && correlations.calmSleepCategory) {
    trends.push('Há uma correlação entre categorias de sonhos e níveis de ansiedade/sono tranquilo que vale monitorar.');
  }

  if (trends.length === 0) {
    trends.push('Registre mais dados para identificar tendências personalizadas.');
  }

  return trends;
}

function generateSummary(analytics, profile, dreamEvolution, emotionalEvolution, sleepEvolution) {
  const totalDreams = analytics.dreams?.total || 0;
  const totalEmotions = analytics.emotions?.total || 0;
  const positivePct = calculatePositivePct(analytics);
  const topCategory = analytics.dreams?.mostFrequentCategory || 'variadas';
  const avgSleep = analytics.sleep?.avgSleepHours;

  let summary = `Nos últimos períodos analisados, foi possível traçar um perfil detalhado do seu mundo onírico. `;
  summary += `Você registrou ${totalDreams} ${totalDreams === 1 ? 'sonho' : 'sonhos'} e ${totalEmotions} ${totalEmotions === 1 ? 'emoção' : 'emoções'}. `;

  if (totalDreams > 0) {
    summary += `A categoria mais recorrente nos seus sonhos é "${topCategory}". `;
  }

  if (avgSleep != null) {
    summary += `Sua média de sono é de ${avgSleep}h por noite. `;
  }

  if (totalEmotions > 0) {
    summary += `Suas emoções são ${positivePct >= 50 ? 'majoritariamente positivas' : 'predominantemente negativas'} (${positivePct}% positivas). `;
  }

  summary += `Seu perfil é "${profile.type}", `;
  summary += `caracterizado por ${profile.characteristics.slice(0, 2).join(' e ').toLowerCase()}. `;

  return summary;
}

function generateConclusion(analytics, profile, dreamScore) {
  const totalDreams = analytics.dreams?.total || 0;
  const totalEmotions = analytics.emotions?.total || 0;

  if (totalDreams === 0 && totalEmotions === 0) {
    return 'Você está no início da sua jornada de autoconhecimento através dos sonhos. Cada registro é um passo importante. Continue explorando e em breve terá um panorama rico e revelador do seu universo interior.';
  }

  const scoreLabel = dreamScore.label;
  let conclusion = `Seu Dream Score de ${dreamScore.score} pontos indica um nível "${scoreLabel}" de desenvolvimento onírico. `;
  conclusion += `Como ${profile.type.toLowerCase()}, você possui uma forma única de se conectar com seus sonhos. `;

  if (dreamScore.score >= 65) {
    conclusion += 'Continue cultivando esse hábito valioso — seus registros revelam um nível avançado de autoconhecimento. ';
  } else if (dreamScore.score >= 40) {
    conclusion += 'Você está no caminho certo. Com mais consistência nos registros, poderá descobrir padrões ainda mais profundos. ';
  } else {
    conclusion += 'Há um grande potencial a ser explorado. Quanto mais você registrar, mais rico será o seu relatório. ';
  }

  conclusion += 'O Dream Line está aqui para acompanhar cada descoberta na sua jornada de autoconhecimento.';

  return conclusion;
}

function getPeriodInfo(analytics) {
  const totalDreams = analytics.dreams?.total || 0;
  const totalEmotions = analytics.emotions?.total || 0;
  const daysActive = totalDreams + totalEmotions > 0 ? Math.max(1, totalDreams + totalEmotions) : 0;

  return {
    days: daysActive,
    startDate: null,
    endDate: new Date().toISOString(),
  };
}

exports.generateReport = async (userId) => {
  const [analytics, intelligence, user] = await Promise.all([
    analyticsService.getAnalytics(userId),
    insightService.generateIntelligence(userId).catch(() => ({
      summary: '', patterns: [], recommendations: [], weeklyInsight: '', sleepInsight: '', emotionalInsight: '', dreamInsight: '',
    })),
    User.findById(userId).select('name email plan dreamCount').lean(),
  ]);

  const dreamScore = calculateDreamScore(analytics);
  const profile = determineDreamerProfile(analytics, { totalInterpretations: analytics.dreams?.total }, analytics.emotions);
  const emotionalEvolution = determineEmotionalEvolution(analytics);
  const dreamEvolution = determineDreamEvolution(analytics);
  const sleepEvolution = determineSleepEvolution(analytics);
  const patterns = generatePatterns(analytics, intelligence);
  const recommendations = generateRecommendations(analytics, intelligence);
  const trends = generateTrends(analytics, dreamEvolution, emotionalEvolution, sleepEvolution);
  const summary = generateSummary(analytics, profile, dreamEvolution, emotionalEvolution, sleepEvolution);
  const conclusion = generateConclusion(analytics, profile, dreamScore);
  const period = getPeriodInfo(analytics);

  return {
    profile,
    dreamScore,
    summary,
    evolution: {
      emotional: emotionalEvolution,
      dreams: dreamEvolution,
      sleep: sleepEvolution,
    },
    correlations: analytics.correlations,
    patterns,
    recommendations,
    trends,
    conclusion,
    period,
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    userInfo: {
      name: user?.name || 'Usuário',
      plan: user?.plan || 'free',
      totalDreams: analytics.dreams?.total || 0,
      totalEmotions: analytics.emotions?.total || 0,
    },
  };
};
