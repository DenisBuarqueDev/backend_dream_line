const Dream = require('../models/Dream');
const Emotion = require('../models/EmotionJournal');
const { DREAM_CATEGORIES } = require('../services/dreamCategorizationService');
const asyncHandler = require('../middleware/asyncHandler');

function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

function buildCorrelationTable(dreams, emotions) {
  const emotionOrder = [...new Set(emotions.map(e => e.emotion))];
  const table = {};
  const emotionCounts = {};
  const dreamCategoryCounts = {};
  let totalDreams = 0;

  for (const cat of DREAM_CATEGORIES) {
    dreamCategoryCounts[cat] = 0;
  }
  for (const em of emotionOrder) {
    table[em] = {};
    emotionCounts[em] = 0;
    for (const cat of DREAM_CATEGORIES) {
      table[em][cat] = 0;
    }
  }

  const sortedEmotions = [...emotions]
    .filter(e => e.createdAt)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const dream of dreams) {
    if (!dream.dreamCategory) continue;
    const cat = dream.dreamCategory;
    if (!DREAM_CATEGORIES.includes(cat)) continue;
    dreamCategoryCounts[cat] = (dreamCategoryCounts[cat] || 0) + 1;
    totalDreams++;

    const dreamDate = dream.createdAt ? new Date(dream.createdAt) : new Date();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    let closest = null;
    let closestDiff = Infinity;

    for (const em of sortedEmotions) {
      const emDate = new Date(em.createdAt);
      const diff = dreamDate - emDate;
      if (diff >= 0 && diff <= THREE_DAYS_MS && diff < closestDiff) {
        closest = em;
        closestDiff = diff;
      }
    }

    if (closest) {
      emotionCounts[closest.emotion] = (emotionCounts[closest.emotion] || 0) + 1;
      table[closest.emotion][cat] = (table[closest.emotion][cat] || 0) + 1;
    }
  }

  const correlationRows = [];
  for (const em of emotionOrder) {
    const total = emotionCounts[em] || 0;
    if (total === 0) continue;
    const row = { emotion: em };
    for (const cat of DREAM_CATEGORIES) {
      const count = table[em]?.[cat] || 0;
      row[cat] = total > 0 ? Math.round((count / total) * 100) : 0;
    }
    correlationRows.push(row);
  }

  const emotionDistribution = {};
  for (const em of emotionOrder) {
    const total = emotionCounts[em] || 0;
    if (total > 0) {
      emotionDistribution[em] = Math.round((total / Math.max(1, totalDreams)) * 100);
    }
  }

  return { correlationRows, emotionDistribution, dreamCategoryCounts, totalDreams, emotionOrder };
}

function generateInsights(corrData) {
  const insights = [];
  const { correlationRows, dreamCategoryCounts, totalDreams, emotionOrder } = corrData;

  if (totalDreams === 0) {
    return ['Registre sonhos e emoções para começar a ver correlações.'];
  }

  const topCategory = Object.entries(dreamCategoryCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCategory && topCategory[1] > 0) {
    insights.push(
      `📊 Categoria de sonho mais frequente: **${topCategory[0]}** (${topCategory[1]} sonhos, ${Math.round((topCategory[1] / totalDreams) * 100)}% do total)`
    );
  }

  for (const row of correlationRows) {
    const maxCat = DREAM_CATEGORIES.reduce((best, c) =>
      (row[c] || 0) > (best?.[1] || 0) ? [c, row[c]] : best,
      null
    );
    if (maxCat && maxCat[1] >= 40) {
      insights.push(
        `🔗 Quando você sente **${row.emotion}**, ${maxCat[1]}% dos sonhos são sobre **${maxCat[0]}**`
      );
    }
  }

  const topEmotion = emotionOrder
    .map(em => ({ emotion: em, count: correlationRows.find(r => r.emotion === em) ? Object.values(correlationRows.find(r => r.emotion === em)).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  if (topEmotion.length > 0) {
    const list = topEmotion.filter(e => e.count > 0).map(e => e.emotion).join(', ');
    if (list) insights.push(`💭 Emoções mais ativas nos sonhos: **${list}**`);
  }

  return insights.length > 0 ? insights : ['Continue registrando para descobrir padrões entre seus sonhos e emoções.'];
}

exports.getCorrelations = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const { start, end } = getDateRange(days);
  const userId = req.user._id;

  const [dreams, emotions] = await Promise.all([
    Dream.find({
      userId,
      createdAt: { $gte: start, $lte: end },
    }).select('dreamCategory createdAt textoSonho').lean(),
    Emotion.find({
      userId,
      createdAt: { $gte: start, $lte: end },
    }).select('emotion intensity createdAt').lean(),
  ]);

  const corrData = buildCorrelationTable(dreams, emotions);
  const insights = generateInsights(corrData);

  res.json({
    days,
    totalDreams: corrData.totalDreams,
    totalEmotions: emotions.length,
    dreamCategories: corrData.dreamCategoryCounts,
    emotionDistribution: corrData.emotionDistribution,
    correlationTable: corrData.correlationRows,
    insights,
  });
});
