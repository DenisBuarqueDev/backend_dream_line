const UserMemory = require('../models/UserMemory');
const MemoryFact = require('../models/MemoryFact');

const RECOMMENDATION_CATALOG = [
  { text: 'Tente estabelecer uma rotina de sono fixa, dormindo e acordando no mesmo horário.', check: (um) => {
    const avg = um?.sono?.averageSleep ?? null;
    return avg !== null && avg < 6;
  }},
  { text: 'Crie um ritual de relaxamento antes de dormir para melhorar a qualidade do sono.', check: (um) => {
    const avg = um?.sono?.averageSleep ?? null;
    return avg !== null && avg < 5;
  }},
  { text: 'Pratique meditação ou respiração profunda antes de dormir para reduzir a intensidade emocional.', check: (um) => {
    const intensity = um?.behavior?.averageEmotionIntensity ?? null;
    return intensity !== null && intensity >= 7;
  }},
  { text: 'Registre suas emoções diariamente para identificar gatilhos emocionais.', check: (um) => {
    const total = um?.stats?.totalEmotions || 0;
    return total > 0 && total < 5;
  }},
  { text: 'Explore os significados dos símbolos recorrentes nos seus sonhos.', check: (um) => {
    const score = um?.profile?.dreamScore?.score ?? null;
    return score !== null && score >= 20 && score < 60;
  }},
  { text: 'Aprofunde sua conexão com o mundo onírico revisitando sonhos marcantes.', check: (um) => {
    const score = um?.profile?.dreamScore?.score ?? null;
    return score !== null && score >= 60;
  }},
  { text: 'Mantenha um diário de sonhos ao lado da cama para registrar assim que acordar.', check: (um) => {
    const total = um?.stats?.totalDreams || 0;
    return total < 5;
  }},
  { text: 'Tente identificar padrões entre suas emoções diárias e os temas dos seus sonhos.', check: (um) => {
    const totalD = um?.stats?.totalDreams || 0;
    const totalE = um?.stats?.totalEmotions || 0;
    return totalD >= 3 && totalE >= 3;
  }},
  { text: 'Reserve 5 minutos pela manhã para refletir sobre o que sonhou.', check: (um) => {
    const score = um?.profile?.dreamScore?.score ?? null;
    return score === null || score === 0;
  }},
  { text: 'Compartilhe seus sonhos com o Chat Dream Line para obter novas perspectivas.', check: () => true },
];

function isNewUser(userMemory) {
  const totalD = userMemory?.stats?.totalDreams || 0;
  const totalE = userMemory?.stats?.totalEmotions || 0;
  const score = userMemory?.profile?.dreamScore?.score ?? null;
  const sleepAvg = userMemory?.sono?.averageSleep ?? null;
  const avgIntensity = userMemory?.behavior?.averageEmotionIntensity ?? null;
  return totalD === 0 && totalE === 0 && (score === null || score === 0) && sleepAvg === null && avgIntensity === null;
}

function classifyStatus(userMemory) {
  const score = userMemory?.profile?.dreamScore?.score ?? null;
  const sleepAvg = userMemory?.sono?.averageSleep ?? null;
  const sleepTrend = userMemory?.sono?.sleepTrend || {};
  const emotionTrend = userMemory?.emotions?.emotionalTrend || {};
  const avgIntensity = userMemory?.behavior?.averageEmotionIntensity ?? null;

  if (isNewUser(userMemory)) return 'Bom';

  let positives = 0;
  let negatives = 0;

  if (score !== null && score > 0) {
    if (score >= 80) positives++;
    else if (score < 40) negatives++;
  }

  if (sleepAvg !== null && sleepAvg >= 7) positives++;
  else if (sleepAvg !== null && sleepAvg < 5) negatives++;

  if (sleepTrend['30d'] != null && sleepTrend['7d'] != null && sleepTrend['7d'] > sleepTrend['30d']) positives++;
  else if (sleepTrend['30d'] != null && sleepTrend['7d'] != null && sleepTrend['7d'] < sleepTrend['30d'] - 0.5) negatives++;

  if (emotionTrend['7d'] != null && emotionTrend['30d'] != null && emotionTrend['7d'] < emotionTrend['30d']) positives++;
  else if (emotionTrend['7d'] != null && emotionTrend['30d'] != null && emotionTrend['7d'] > emotionTrend['30d'] + 0.5) negatives++;

  if (avgIntensity !== null && avgIntensity <= 5) positives++;
  else if (avgIntensity !== null && avgIntensity >= 7) negatives++;

  const total = positives + negatives;
  if (total === 0) return 'Bom';

  const ratio = positives / Math.max(1, total);
  if (ratio >= 0.8) return 'Excelente';
  if (ratio >= 0.6) return 'Muito Bom';
  if (ratio >= 0.4) return 'Bom';
  if (ratio >= 0.2) return 'Atenção';
  return 'Crítico';
}

function buildEvolution(userMemory) {
  const lines = [];

  const sleepTrend = userMemory?.sono?.sleepTrend || {};
  if (sleepTrend['7d'] != null && sleepTrend['30d'] != null) {
    if (sleepTrend['7d'] > sleepTrend['30d'] + 0.3) {
      lines.push('Sua qualidade de sono apresentou melhora nas últimas semanas.');
    } else if (sleepTrend['7d'] < sleepTrend['30d'] - 0.3) {
      lines.push('Sua qualidade de sono reduziu ligeiramente nas últimas semanas.');
    } else {
      lines.push('Seu padrão de sono se manteve estável.');
    }
  } else if (sleepTrend['7d'] != null) {
    lines.push(`Sua média de sono nos últimos 7 dias foi de ${sleepTrend['7d']} horas.`);
  }

  const emotionTrend = userMemory?.emotions?.emotionalTrend || {};
  if (emotionTrend['7d'] != null && emotionTrend['30d'] != null) {
    if (emotionTrend['7d'] < emotionTrend['30d'] - 0.3) {
      lines.push('Sua intensidade emocional reduziu, indicando maior estabilidade.');
    } else if (emotionTrend['7d'] > emotionTrend['30d'] + 0.3) {
      lines.push('Sua intensidade emocional aumentou nas últimas semanas.');
    } else {
      lines.push('Suas emoções se mantiveram em um padrão consistente.');
    }
  }

  const score = userMemory?.profile?.dreamScore?.score ?? null;
  if (score !== null && score > 0) {
    if (score >= 80) lines.push('Seu Dream Score está excelente — você está em sintonia com seus sonhos.');
    else if (score >= 60) lines.push('Seu Dream Score está bom — continue explorando seus sonhos.');
    else if (score >= 40) lines.push('Seu Dream Score está em desenvolvimento — cada registro conta.');
    else lines.push('Você está começando sua jornada onírica — persistência é a chave.');
  }

  return lines.length > 0 ? lines : ['Ainda não há dados suficientes para analisar sua evolução.'];
}

function buildPositives(userMemory, memoryFacts) {
  const items = [];

  const sleepTrend = userMemory?.sono?.sleepTrend || {};
  if (sleepTrend['7d'] != null && sleepTrend['30d'] != null && sleepTrend['7d'] > sleepTrend['30d'] + 0.3) {
    items.push('Aumento da qualidade do sono');
  }

  const sleepAvg = userMemory?.sono?.averageSleep ?? null;
  if (sleepAvg !== null && sleepAvg >= 7) items.push('Rotina de sono saudável');

  const emotionTrend = userMemory?.emotions?.emotionalTrend || {};
  if (emotionTrend['7d'] != null && emotionTrend['30d'] != null && emotionTrend['7d'] < emotionTrend['30d'] - 0.3) {
    items.push('Redução da intensidade emocional');
  }

  const distribution = userMemory?.emotions?.emotionDistribution || [];
  const positiveEmotions = distribution.filter(e => ['alegria', 'calma', 'amor', 'gratidao', 'esperanca', 'tranquilidade'].includes(e.emotion));
  if (positiveEmotions.length > 0 && positiveEmotions[0].percentage >= 30) {
    items.push('Predomínio de emoções positivas');
  }

  const consistencyScore = userMemory?.behavior?.consistencyScore ?? null;
  if (consistencyScore !== null && consistencyScore >= 60) items.push('Alta consistência nos registros');

  if (userMemory?.stats?.totalDreams >= 10) items.push('Regularidade no registro de sonhos');

  const score = userMemory?.profile?.dreamScore?.score ?? null;
  if (score !== null && score >= 70) items.push('Boa conexão com o mundo onírico');

  const factCategories = [...new Set((memoryFacts || []).map(f => f.category))];
  if (factCategories.includes('Hábitos')) items.push('Desenvolvimento de novos hábitos');
  if (factCategories.includes('Objetivos')) items.push('Clareza em relação a objetivos pessoais');

  return items.length > 0 ? items.slice(0, 5) : ['Continue registrando para identificarmos padrões positivos.'];
}

function buildConcerns(userMemory) {
  const items = [];

  const sleepAvg = userMemory?.sono?.averageSleep ?? null;
  if (sleepAvg !== null && sleepAvg < 5) items.push('Qualidade do sono abaixo do ideal');

  const sleepTrend = userMemory?.sono?.sleepTrend || {};
  if (sleepTrend['7d'] != null && sleepTrend['30d'] != null && sleepTrend['7d'] < sleepTrend['30d'] - 0.5) {
    items.push('Queda na qualidade do sono nas últimas semanas');
  }

  const emotionTrend = userMemory?.emotions?.emotionalTrend || {};
  if (emotionTrend['7d'] != null && emotionTrend['30d'] != null && emotionTrend['7d'] > emotionTrend['30d'] + 0.5) {
    items.push('Aumento da intensidade emocional');
  }

  const avgIntensity = userMemory?.behavior?.averageEmotionIntensity ?? null;
  if (avgIntensity !== null && avgIntensity >= 7) items.push('Emoções com intensidade elevada');

  const distribution = userMemory?.emotions?.emotionDistribution || [];
  const negativeEmotions = distribution.filter(e =>
    ['tristeza', 'ansiedade', 'medo', 'raiva'].includes(e.emotion) &&
    e.percentage >= 20
  );
  for (const e of negativeEmotions) {
    items.push(`Presença recorrente de ${e.emotion}`);
  }

  if (userMemory?.correlacoes?.stressCategory) {
    items.push(`Sonhos da categoria "${userMemory.correlacoes.stressCategory}" associados a estresse`);
  }

  if (userMemory?.stats?.totalDreams === 0) items.push('Nenhum sonho registrado ainda');
  if (userMemory?.stats?.totalEmotions === 0) items.push('Nenhuma emoção registrada ainda');

  return items.length > 0 ? items.slice(0, 5) : ['Nenhum ponto de atenção identificado no momento.'];
}

function buildRecommendations(userMemory, memoryFacts) {
  const recs = [];

  if (userMemory?.insights?.recommendations && userMemory.insights.recommendations.length > 0) {
    for (const r of userMemory.insights.recommendations.slice(0, 3)) {
      recs.push(r.title || r.description);
    }
  }

  for (const entry of RECOMMENDATION_CATALOG) {
    if (recs.length >= 5) break;
    const text = entry.text;
    if (recs.includes(text)) continue;
    if (entry.check(userMemory)) {
      recs.push(text);
    }
  }

  return recs.slice(0, 5);
}

function buildMotivation(userMemory) {
  const totalDreams = userMemory?.stats?.totalDreams || 0;
  const totalEmotions = userMemory?.stats?.totalEmotions || 0;
  const total = totalDreams + totalEmotions;

  if (total === 0) return 'Comece registrando seu primeiro sonho ou emoção — cada pequeno passo importa.';
  if (total === 1) return 'Primeiro registro! Você deu o passo mais importante.';
  if (total === 2) return 'Dois registros — a consistência está começando a aparecer.';
  if (total <= 5) return 'Você já está construindo seu diário onírico. Continue assim!';
  if (total <= 10) return 'Seus registros estão crescendo — em breve padrões vão surgir.';
  if (total <= 20) return 'Você está desenvolvendo um olhar mais atento aos seus sonhos e emoções.';
  if (total <= 30) return 'Sua jornada de autoconhecimento já tem consistência. Continue explorando!';
  if (total <= 50) return 'Você já percorreu um longo caminho. Seu diário é um tesouro de insights.';
  return 'Você construiu um diário rico em autoconhecimento. Seu futuro eu agradece.';
}

async function generateCoachReport(userId) {
  const [userMemory, memoryFacts] = await Promise.all([
    UserMemory.findOne({ userId }).lean(),
    MemoryFact.find({ userId, isActive: true })
      .sort({ importanceScore: -1 })
      .limit(10)
      .select('category fact importanceScore')
      .lean(),
  ]);

  const report = {
    overallStatus: classifyStatus(userMemory),
    evolution: buildEvolution(userMemory),
    positives: buildPositives(userMemory, memoryFacts),
    concerns: buildConcerns(userMemory),
    recommendations: buildRecommendations(userMemory, memoryFacts),
    motivation: buildMotivation(userMemory),
    generatedAt: new Date().toISOString(),
  };

  return report;
}

module.exports = { generateCoachReport };
