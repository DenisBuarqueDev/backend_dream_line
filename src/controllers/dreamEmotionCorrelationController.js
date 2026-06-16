const Dream = require('../models/Dream');
const Emotion = require('../models/EmotionJournal');
const { categorizeDream, DREAM_CATEGORIES } = require('../services/dreamCategorizationService');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse } = require('../utils/response');

function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

exports.getCorrelations = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const { start, end } = getDateRange(days);
  const userId = req.userId;

  // ── 1. Buscar dados ─────────────────────────────────────────
  const [dreams, emotions] = await Promise.all([
    Dream.find({ userId, createdAt: { $gte: start, $lte: end } })
      .select('dreamCategory createdAt textoSonho')
      .lean(),
    Emotion.find({ userId, createdAt: { $gte: start, $lte: end } })
      .select('emotion createdAt')
      .lean(),
  ]);

  console.log('📊 Dreams encontrados:', dreams.length);
  console.log('📊 EmotionJournal encontrados:', emotions.length);

  // ── 2. Auto-categorizar sonhos sem categoria ────────────────
  // Only auto-categorize when dreamCategory is truly absent (pre-migration docs).
  // Dreams with default 'Outros' are kept as-is to avoid re-processing every request.
  let autoCatCount = 0;
  for (const dream of dreams) {
    if (dream.dreamCategory === undefined || dream.dreamCategory === null) {
      const text = (dream.textoSonho || '').trim();
      if (text) {
        const category = await categorizeDream(text);
        await Dream.updateOne({ _id: dream._id }, { dreamCategory: category });
        dream.dreamCategory = category;
        autoCatCount++;
      } else {
        dream.dreamCategory = 'Outros';
      }
    }
  }
  if (autoCatCount > 0) {
    console.log('🤖 Categorizados automaticamente:', autoCatCount);
  }

  // ── 3. Correlacionar (±3 dias) ──────────────────────────────
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  // emotion → dreamCategory → count
  const corrMap = {};
  // emotion → how many distinct dreams it touched
  const emotionDreamTotal = {};

  for (const dream of dreams) {
    if (!dream.dreamCategory) continue;
    const dreamMs = new Date(dream.createdAt).getTime();

    // Find all emotions within ±3 days
    const matched = emotions.filter(e => {
      const emMs = new Date(e.createdAt).getTime();
      return Math.abs(dreamMs - emMs) <= THREE_DAYS_MS;
    });

    // Deduplicate by emotion type per dream
    const uniqueEmotions = [...new Set(matched.map(e => e.emotion))];

    for (const emotion of uniqueEmotions) {
      if (!corrMap[emotion]) corrMap[emotion] = {};
      corrMap[emotion][dream.dreamCategory] = (corrMap[emotion][dream.dreamCategory] || 0) + 1;
      emotionDreamTotal[emotion] = (emotionDreamTotal[emotion] || 0) + 1;
    }
  }

  // ── 4. Montar resposta ──────────────────────────────────────
  const correlations = [];

  for (const [emotion, categories] of Object.entries(corrMap)) {
    const total = emotionDreamTotal[emotion];
    for (const [dreamCategory, occurrences] of Object.entries(categories)) {
      correlations.push({
        emotion,
        dreamCategory,
        occurrences,
        percentage: Math.round((occurrences / total) * 100),
      });
    }
  }

  correlations.sort((a, b) => b.occurrences - a.occurrences);

  // ── 5. Distribuição de categorias (para o gráfico) ──────────
  const dreamCategoryCounts = {};
  for (const cat of DREAM_CATEGORIES) dreamCategoryCounts[cat] = 0;
  for (const dream of dreams) {
    if (dream.dreamCategory && DREAM_CATEGORIES.includes(dream.dreamCategory)) {
      dreamCategoryCounts[dream.dreamCategory]++;
    }
  }

  // ── 6. Matriz de calor (emotion × category em %) ────────────
  const heatEmotions = [...new Set(correlations.map(c => c.emotion))].sort();
  const heatRows = heatEmotions.map(emotion => {
    const row = { emotion };
    for (const cat of DREAM_CATEGORIES) {
      const found = correlations.find(c => c.emotion === emotion && c.dreamCategory === cat);
      row[cat] = found ? found.percentage : 0;
    }
    return row;
  });

  // ── 7. Insights ─────────────────────────────────────────────
  const insights = [];

  if (correlations.length === 0) {
    insights.push('Nenhuma correlação encontrada no período. Registre emoções próximas aos seus sonhos.');
  } else {
    const top = correlations[0];
    insights.push(
      `🔗 Maior correlação: **${top.emotion}** → **${top.dreamCategory}** (${top.occurrences} sonhos, ${top.percentage}%)`
    );

    // Top categoria geral
    const catEntries = Object.entries(dreamCategoryCounts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (catEntries.length > 0) {
      const [topCat, topCount] = catEntries[0];
      insights.push(
        `📊 Categoria mais frequente: **${topCat}** (${topCount} sonhos)`
      );
    }

    // Emoções com forte correlação (>50%)
    for (const c of correlations) {
      if (c.percentage >= 50) {
        insights.push(
          `🧠 Quando você sente **${c.emotion}**, ${c.percentage}% dos sonhos são sobre **${c.dreamCategory}**`
        );
      }
    }
  }

  const categoriesIdentified = Object.entries(dreamCategoryCounts).filter(([, v]) => v > 0).length;

  console.log('📊 Registros correlacionados:', correlations.length);
  console.log('📊 Categorias identificadas:', categoriesIdentified);

  successResponse(res, {
    days,
    totalDreams: dreams.length,
    totalEmotions: emotions.length,
    correlatedCount: correlations.length,
    categoriesIdentified,
    correlations,
    dreamCategories: dreamCategoryCounts,
    correlationTable: heatRows,
    insights,
  });
});
