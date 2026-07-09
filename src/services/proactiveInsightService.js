const UserMemory = require('../models/UserMemory');
const crypto = require('crypto');

function generateId(title) {
  return crypto.createHash('md5').update(title).digest('hex').slice(0, 12);
}

function detectSleepChanges(memory) {
  const insights = [];
  const trend = memory.sono || {};
  const { sleepTrend } = trend;

  if (!sleepTrend) return insights;

  const validPeriods = [];
  for (const p of ['7d', '30d', '90d']) {
    if (sleepTrend[p] !== null && sleepTrend[p] !== undefined) validPeriods.push(p);
  }
  if (validPeriods.length < 2) return insights;

  const recent = validPeriods[0];
  const older = validPeriods[1];
  const diff = sleepTrend[recent] - sleepTrend[older];
  const absDiff = Math.abs(diff);

  if (absDiff < 0.3) return insights;

  if (diff > 0 && absDiff >= 0.5) {
    insights.push({
      insightId: generateId('sono_melhora'),
      title: 'Melhora na qualidade do sono',
      description: `Sua média de sono melhorou nas últimas semanas, com aumento consistente na duração do sono.`,
      category: 'sono',
      priority: absDiff >= 1 ? 'high' : 'medium',
    });
  } else if (diff < 0 && absDiff >= 0.5) {
    insights.push({
      insightId: generateId('sono_piora'),
      title: 'Redução na qualidade do sono',
      description: `Sua média de sono diminuiu nas últimas semanas. Pode ser um bom momento para revisar sua rotina.`,
      category: 'sono',
      priority: absDiff >= 1 ? 'high' : 'medium',
    });
  }

  return insights;
}

function detectEmotionalChanges(memory) {
  const insights = [];
  const emotions = memory.emotions || {};
  const behavior = memory.behavior || {};

  const trend = emotions.emotionalTrend;
  if (trend) {
    const validPeriods = [];
    for (const p of ['7d', '30d', '90d']) {
      if (trend[p] !== null && trend[p] !== undefined) validPeriods.push(p);
    }

    if (validPeriods.length >= 2) {
      const recent = trend[validPeriods[0]];
      const older = trend[validPeriods[1]];
      const diff = recent - older;
      const absDiff = Math.abs(diff);

      if (absDiff >= 0.3) {
        if (diff < 0) {
          insights.push({
            insightId: generateId('emocional_melhora'),
            title: 'Redução da intensidade emocional',
            description: `Sua intensidade emocional diminuiu, indicando maior estabilidade emocional.`,
            category: 'emoções',
            priority: absDiff >= 0.8 ? 'high' : 'medium',
          });
        } else {
          insights.push({
            insightId: generateId('emocional_aumento'),
            title: 'Aumento da intensidade emocional',
            description: `Sua intensidade emocional aumentou nas últimas semanas. Pode ser útil identificar as causas.`,
            category: 'emoções',
            priority: absDiff >= 0.8 ? 'high' : 'medium',
          });
        }
      }
    }
  }

  const dist = emotions.emotionDistribution || [];
  if (dist.length > 0) {
    const top = dist.reduce((a, b) => (a.percentage > b.percentage ? a : b));
    if (top.percentage >= 30) {
      insights.push({
        insightId: generateId(`emocao_predominante_${top.emotion}`),
        title: `Predominância de ${top.emotion.toLowerCase()}`,
        description: `${top.emotion} tem sido a emoção mais frequente, presente em ${Math.round(top.percentage)}% dos registros.`,
        category: 'emoções',
        priority: top.percentage >= 50 ? 'high' : 'medium',
      });
    }
  }

  return insights;
}

function detectDreamChanges(memory) {
  const insights = [];
  const dreams = memory.dreams || {};

  const categories = dreams.predominantCategories || [];
  if (categories.length > 0) {
    const top = categories[0];
    if (top.percentage >= 30) {
      insights.push({
        insightId: generateId(`categoria_${top.category}`),
        title: `Categoria recorrente: ${top.category}`,
        description: `Sonhos da categoria ${top.category} representam ${Math.round(top.percentage)}% dos seus registros.`,
        category: 'sonhos',
        priority: top.percentage >= 50 ? 'medium' : 'low',
      });
    }
  }

  const symbols = memory.tags?.topSymbols || [];
  if (symbols.length > 0 && symbols[0].count >= 3) {
    insights.push({
      insightId: generateId(`simbolo_${symbols[0].symbol}`),
      title: `Símbolo frequente: ${symbols[0].symbol}`,
      description: `O símbolo "${symbols[0].symbol}" apareceu ${symbols[0].count} vezes em seus sonhos.`,
      category: 'padrões',
      priority: symbols[0].count >= 5 ? 'medium' : 'low',
    });
  }

  return insights;
}

function detectEngagementChanges(memory) {
  const insights = [];
  const behavior = memory.behavior || {};

  if (behavior.consistencyScore !== null && behavior.consistencyScore !== undefined) {
    if (behavior.consistencyScore >= 70) {
      insights.push({
        insightId: generateId('consistencia_alta'),
        title: 'Consistência nos registros',
        description: `Você mantém uma rotina consistente de registros, o que permite um acompanhamento mais preciso.`,
        category: 'hábitos',
        priority: 'medium',
      });
    } else if (behavior.consistencyScore <= 20 && memory.stats?.totalDreams > 5) {
      insights.push({
        insightId: generateId('consistencia_baixa'),
        title: 'Queda na frequência de registros',
        description: `A frequência de registros diminuiu. Manter uma rotina regular ajuda no autoconhecimento.`,
        category: 'hábitos',
        priority: 'medium',
      });
    }
  }

  return insights;
}

function detectDreamScoreChange(memory) {
  const insights = [];
  const profile = memory.profile || {};

  if (profile.dreamScore && profile.dreamScore.score !== null && profile.dreamScore.score !== undefined) {
    if (profile.dreamScore.score >= 70) {
      insights.push({
        insightId: generateId('dream_score_alto'),
        title: 'Dream Score elevado',
        description: `Seu Dream Score está em ${profile.dreamScore.score}, indicando um bom momento na sua conexão com os sonhos.`,
        category: 'evolução',
        priority: 'high',
      });
    } else if (profile.dreamScore.score <= 30) {
      insights.push({
        insightId: generateId('dream_score_baixo'),
        title: 'Dream Score baixo',
        description: `Seu Dream Score está em ${profile.dreamScore.score}. Que tal explorar formas de fortalecer sua conexão com os sonhos?`,
        category: 'evolução',
        priority: 'high',
      });
    }
  }

  return insights;
}

function mergeInsights(existing, newInsights) {
  const merged = [];
  const seen = new Set();

  for (const insight of existing) {
    if (!insight.isActive) continue;
    const key = insight.insightId;
    seen.add(key);
    const match = newInsights.find(n => n.insightId === key);
    if (match) {
      merged.push({
        ...insight,
        lastUpdated: new Date(),
      });
    } else {
      merged.push(insight);
    }
  }

  for (const insight of newInsights) {
    if (seen.has(insight.insightId)) continue;
    seen.add(insight.insightId);
    merged.push({
      ...insight,
      createdAt: new Date(),
      lastUpdated: new Date(),
      isActive: true,
    });
  }

  if (merged.length <= 5) return merged;

  const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
  merged.sort((a, b) => {
    const pa = priorityOrder[a.priority] || 0;
    const pb = priorityOrder[b.priority] || 0;
    if (pa !== pb) return pb - pa;
    return new Date(b.lastUpdated) - new Date(a.lastUpdated);
  });

  return merged.slice(0, 5);
}

async function detectChanges(userId) {
  try {
    const memory = await UserMemory.findOne({ userId });
    if (!memory) return;

    const newInsights = [
      ...detectSleepChanges(memory),
      ...detectEmotionalChanges(memory),
      ...detectDreamChanges(memory),
      ...detectEngagementChanges(memory),
      ...detectDreamScoreChange(memory),
    ];

    if (newInsights.length === 0 && (!memory.proactiveInsights || memory.proactiveInsights.length === 0)) return;

    const existing = memory.proactiveInsights || [];
    const merged = mergeInsights(existing, newInsights);

    await UserMemory.findOneAndUpdate(
      { userId },
      { $set: { proactiveInsights: merged } },
    );

    if (newInsights.length > 0) {
      console.log(`[ProactiveInsight] userId=${userId} total=${merged.length} new=${newInsights.length}`);
    }
  } catch (err) {
    console.error(`[ProactiveInsight] Error for userId=${userId}: ${err.message}`);
  }
}

module.exports = { detectChanges };
