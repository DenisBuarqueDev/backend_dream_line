const mongoose = require('mongoose');
const Dream = require('../models/Dream');
const EmotionJournal = require('../models/EmotionJournal');

const POSITIVE_EMOTIONS = ['alegria', 'calma', 'amor', 'gratidao', 'esperanca', 'tranquilidade'];
const NEGATIVE_EMOTIONS = ['tristeza', 'ansiedade', 'medo', 'raiva', 'nojinho', 'vergonha', 'culpa'];
const STRESS_EMOTIONS = ['ansiedade', 'raiva', 'medo'];
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

function timeToMinutes(time) {
  if (!time || typeof time !== 'string') return null;
  const parts = time.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  if (totalMinutes == null || isNaN(totalMinutes)) return null;
  let m = Math.round(totalMinutes);
  const h = Math.floor(m / 60) % 24;
  m = m % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getSleepStats(userId) {
  const userIdObj = toObjectId(userId);

  const [avgResult, dayOfWeekData] = await Promise.all([
    Dream.aggregate([
      { $match: { userId: userIdObj, 'sono.duracaoHoras': { $ne: null } } },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$sono.duracaoHoras' },
          minHours: { $min: '$sono.duracaoHoras' },
          maxHours: { $max: '$sono.duracaoHoras' },
        },
      },
    ]),
    Dream.aggregate([
      { $match: { userId: userIdObj, 'sono.duracaoHoras': { $ne: null } } },
      {
        $addFields: {
          dayOfWeek: { $dayOfWeek: '$createdAt' },
          bedMinutes: {
            $cond: {
              if: { $ne: ['$sono.horaDormir', null] },
              then: {
                $add: [
                  { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ['$sono.horaDormir', ':'] }, 0] } }, 60] },
                  { $toInt: { $arrayElemAt: [{ $split: ['$sono.horaDormir', ':'] }, 1] } },
                ],
              },
              else: null,
            },
          },
          wakeMinutes: {
            $cond: {
              if: { $ne: ['$sono.horaAcordar', null] },
              then: {
                $add: [
                  { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ['$sono.horaAcordar', ':'] }, 0] } }, 60] },
                  { $toInt: { $arrayElemAt: [{ $split: ['$sono.horaAcordar', ':'] }, 1] } },
                ],
              },
              else: null,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          avgBed: { $avg: '$bedMinutes' },
          avgWake: { $avg: '$wakeMinutes' },
        },
      },
    ]),
    Dream.aggregate([
      { $match: { userId: userIdObj } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
          avgHours: { $avg: '$sono.duracaoHoras' },
        },
      },
      { $sort: { count: -1 } },
    ]),
    Dream.aggregate([
      { $match: { userId: userIdObj, 'sono.duracaoHoras': { $ne: null } } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          avgHours: { $avg: '$sono.duracaoHoras' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),
  ]);

  const [trend7d, trend30d, trend90d, trend365d] = await Promise.all([
    getSleepAvgForPeriod(userIdObj, 7),
    getSleepAvgForPeriod(userIdObj, 30),
    getSleepAvgForPeriod(userIdObj, 90),
    getSleepAvgForPeriod(userIdObj, 365),
  ]);

  const avg = avgResult[0] || {};
  const timeData = dayOfWeekData[0] || {};

  // Day of week with sono data
  const sleepDayEntries = dayOfWeekData;
  const bestDreamDay = sleepDayEntries.length > 0
    ? { day: DAY_LABELS[(sleepDayEntries[0]._id - 1) % 7], count: sleepDayEntries[0].count }
    : null;
  const worstDreamDay = sleepDayEntries.length > 0
    ? { day: DAY_LABELS[(sleepDayEntries[sleepDayEntries.length - 1]._id - 1) % 7], count: sleepDayEntries[sleepDayEntries.length - 1].count }
    : null;

  // Day with most/least dreams (all dreams, not just with sleep data)
  const dreamDayEntries = dayOfWeekData;
  const mostDreamDay = dreamDayEntries.length > 0
    ? { day: DAY_LABELS[(dreamDayEntries[0]._id - 1) % 7], count: dreamDayEntries[0].count }
    : null;
  const leastDreamDay = dreamDayEntries.length > 0
    ? { day: DAY_LABELS[(dreamDayEntries[dreamDayEntries.length - 1]._id - 1) % 7], count: dreamDayEntries[dreamDayEntries.length - 1].count }
    : null;

  return {
    avgSleepHours: avg.avgHours != null ? Math.round(avg.avgHours * 10) / 10 : null,
    avgBedTime: timeData.avgBed != null ? minutesToTime(timeData.avgBed) : null,
    avgWakeTime: timeData.avgWake != null ? minutesToTime(timeData.avgWake) : null,
    minSleepHours: avg.minHours != null ? Math.round(avg.minHours * 10) / 10 : null,
    maxSleepHours: avg.maxHours != null ? Math.round(avg.maxHours * 10) / 10 : null,
    trend: { '7d': trend7d, '30d': trend30d, '90d': trend90d, '365d': trend365d },
    bestDreamDay: bestDreamDay?.day ?? null,
    worstDreamDay: worstDreamDay?.day ?? null,
    mostDreamDay: mostDreamDay?.day ?? null,
    leastDreamDay: leastDreamDay?.day ?? null,
  };
}

async function getSleepAvgForPeriod(userIdObj, days) {
  const start = getDateDaysAgo(days);
  const result = await Dream.aggregate([
    { $match: { userId: userIdObj, createdAt: { $gte: start }, 'sono.duracaoHoras': { $ne: null } } },
    { $group: { _id: null, avg: { $avg: '$sono.duracaoHoras' } } },
  ]);
  return result.length > 0 && result[0].avg != null
    ? Math.round(result[0].avg * 10) / 10
    : null;
}

async function getDreamStats(userId) {
  const userIdObj = toObjectId(userId);

  const [total, perWeek, perMonth, categories, weeklyCatCounts, patternsResult] = await Promise.all([
    Dream.countDocuments({ userId }),
    Dream.aggregate([
      { $match: { userId: userIdObj } },
      {
        $group: {
          _id: { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.week': -1 } },
      { $limit: 12 },
    ]),
    Dream.aggregate([
      { $match: { userId: userIdObj } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]),
    Dream.aggregate([
      { $match: { userId: userIdObj, dreamCategory: { $ne: null } } },
      { $group: { _id: '$dreamCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Dream.aggregate([
      { $match: { userId: userIdObj, dreamCategory: { $ne: null } } },
      { $group: { _id: '$dreamCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Dream.aggregate([
      { $match: { userId: userIdObj } },
      {
        $project: {
          tematicos: { $ifNull: ['$padroes.tematicos', []] },
          espirituais: { $ifNull: ['$padroes.espirituais', []] },
          biologicos: { $ifNull: ['$padroes.biologicos', []] },
          aiEmotions: { $ifNull: ['$aiData.emotions', []] },
        },
      },
    ]),
  ]);

  const totalDreamsWithCategory = categories.reduce((s, c) => s + c.count, 0);

  const topCategories = categories.map((c) => ({
    category: c._id,
    count: c.count,
    percentage: totalDreamsWithCategory > 0
      ? Math.round((c.count / totalDreamsWithCategory) * 100)
      : 0,
  }));

  const patternCounts = { tematicos: {}, espirituais: {}, biologicos: {}, emocionais: {} };
  for (const doc of patternsResult) {
    for (const p of (doc.tematicos || [])) {
      patternCounts.tematicos[p] = (patternCounts.tematicos[p] || 0) + 1;
    }
    for (const p of (doc.espirituais || [])) {
      patternCounts.espirituais[p] = (patternCounts.espirituais[p] || 0) + 1;
    }
    for (const p of (doc.biologicos || [])) {
      patternCounts.biologicos[p] = (patternCounts.biologicos[p] || 0) + 1;
    }
    for (const e of (doc.aiEmotions || [])) {
      patternCounts.emocionais[e] = (patternCounts.emocionais[e] || 0) + 1;
    }
  }

  const patterns = {};
  for (const key of ['tematicos', 'espirituais', 'biologicos', 'emocionais']) {
    patterns[key] = Object.entries(patternCounts[key])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  const mostFrequentCategory = weeklyCatCounts.length > 0
    ? weeklyCatCounts[0]._id
    : null;

  return {
    total,
    perWeek: perWeek.map((w) => ({ year: w._id.year, week: w._id.week, count: w.count })),
    perMonth: perMonth.map((m) => ({ year: m._id.year, month: m._id.month, count: m.count })),
    categories: topCategories,
    patterns,
    mostFrequentCategory,
  };
}

async function getEmotionStats(userId) {
  const userIdObj = toObjectId(userId);

  const [total, distribution, avgIntensityResult, perWeek, perMonth, dailyIntensity] = await Promise.all([
    EmotionJournal.countDocuments({ userId }),
    EmotionJournal.aggregate([
      { $match: { userId: userIdObj } },
      {
        $group: {
          _id: '$emotion',
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
          maxIntensity: { $max: '$intensity' },
          minIntensity: { $min: '$intensity' },
        },
      },
      { $sort: { count: -1 } },
    ]),
    EmotionJournal.aggregate([
      { $match: { userId: userIdObj } },
      { $group: { _id: null, avg: { $avg: '$intensity' } } },
    ]),
    EmotionJournal.aggregate([
      { $match: { userId: userIdObj } },
      {
        $group: {
          _id: { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } },
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
        },
      },
      { $sort: { '_id.year': -1, '_id.week': -1 } },
      { $limit: 12 },
    ]),
    EmotionJournal.aggregate([
      { $match: { userId: userIdObj } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]),
    EmotionJournal.aggregate([
      {
        $match: {
          userId: userIdObj,
          createdAt: { $gte: getDateDaysAgo(30) },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          date: { $first: '$createdAt' },
          avgIntensity: { $avg: '$intensity' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]),
  ]);

  const avgIntensity = avgIntensityResult.length > 0
    ? Math.round(avgIntensityResult[0].avg * 10) / 10
    : 0;

  const [trend7d, trend30d, trend90d, trend365d] = await Promise.all([
    getEmotionAvgForPeriod(userIdObj, 7),
    getEmotionAvgForPeriod(userIdObj, 30),
    getEmotionAvgForPeriod(userIdObj, 90),
    getEmotionAvgForPeriod(userIdObj, 365),
  ]);

  let mostFrequent = null;
  let mostIntense = null;
  let leastIntense = null;

  if (distribution.length > 0) {
    mostFrequent = distribution[0]._id;
    mostIntense = distribution.reduce((a, b) => (b.maxIntensity > a.maxIntensity ? b : a))._id;
    leastIntense = distribution.reduce((a, b) => (b.minIntensity < a.minIntensity ? b : a))._id;
  }

  return {
    total,
    predominant: distribution.length > 0 ? distribution[0]._id : null,
    mostFrequent,
    mostIntense,
    leastIntense,
    averageIntensity: avgIntensity,
    distribution: distribution.map((e) => ({
      emotion: e._id,
      count: e.count,
      percentage: total > 0 ? Math.round((e.count / total) * 100) : 0,
      avgIntensity: Math.round(e.avgIntensity * 10) / 10,
    })),
    perWeek: perWeek.map((w) => ({
      year: w._id.year,
      week: w._id.week,
      count: w.count,
      avgIntensity: Math.round(w.avgIntensity * 10) / 10,
    })),
    perMonth: perMonth.map((m) => ({
      year: m._id.year,
      month: m._id.month,
      count: m.count,
      avgIntensity: Math.round(m.avgIntensity * 10) / 10,
    })),
    dailyIntensity: dailyIntensity
      .filter((d) => d.date)
      .map((d) => ({
        date: d.date,
        avgIntensity: Math.round(d.avgIntensity * 10) / 10,
        count: d.count,
      })),
    intensityTrend: { '7d': trend7d, '30d': trend30d, '90d': trend90d, '365d': trend365d },
  };
}

async function getEmotionAvgForPeriod(userIdObj, days) {
  const start = getDateDaysAgo(days);
  const result = await EmotionJournal.aggregate([
    { $match: { userId: userIdObj, createdAt: { $gte: start } } },
    { $group: { _id: null, avg: { $avg: '$intensity' } } },
  ]);
  return result.length > 0 && result[0].avg != null
    ? Math.round(result[0].avg * 10) / 10
    : null;
}

async function getCorrelationInsights(userId) {
  const userIdObj = toObjectId(userId);
  const start = getDateDaysAgo(90);

  const [dreams, emotions] = await Promise.all([
    Dream.find({ userId, createdAt: { $gte: start }, dreamCategory: { $ne: null } })
      .select('dreamCategory createdAt')
      .lean(),
    EmotionJournal.find({ userId, createdAt: { $gte: start } })
      .select('emotion createdAt intensity')
      .lean(),
  ]);

  // Group emotions by date (YYYY-MM-DD)
  const emotionsByDate = {};
  for (const e of emotions) {
    const key = e.createdAt.toISOString().split('T')[0];
    if (!emotionsByDate[key]) emotionsByDate[key] = [];
    emotionsByDate[key].push(e);
  }

  // For each dream, find emotions on the same day
  const categoryEmotionCounts = {}; // category -> emotion -> count
  for (const dream of dreams) {
    const key = dream.createdAt.toISOString().split('T')[0];
    const dayEmotions = emotionsByDate[key] || [];
    const uniqueEmotions = [...new Set(dayEmotions.map((e) => e.emotion))];

    const cat = dream.dreamCategory;
    if (!categoryEmotionCounts[cat]) categoryEmotionCounts[cat] = {};
    for (const emotion of uniqueEmotions) {
      categoryEmotionCounts[cat][emotion] = (categoryEmotionCounts[cat][emotion] || 0) + 1;
    }
  }

  // predominantEmotionByCategory
  const predominantEmotionByCategory = Object.entries(categoryEmotionCounts)
    .map(([category, emotions]) => {
      const entries = Object.entries(emotions).sort((a, b) => b[1] - a[1]);
      const total = entries.reduce((s, e) => s + e[1], 0);
      return {
        category,
        emotion: entries[0][0],
        probability: Math.round((entries[0][1] / total) * 100),
      };
    })
    .sort((a, b) => b.probability - a.probability);

  // Category scoring for stress, anxiety, calm, positive, negative
  let stressCategory = null;
  let anxietyCategory = null;
  let calmSleepCategory = null;
  let mostPositiveCategory = null;
  let mostNegativeCategory = null;
  let maxStress = 0;
  let maxAnxiety = 0;
  let maxCalm = 0;
  let maxPositive = 0;
  let maxNegative = 0;

  for (const [category, emotions] of Object.entries(categoryEmotionCounts)) {
    const total = Object.values(emotions).reduce((s, c) => s + c, 0);
    if (total === 0) continue;

    for (const [emotion, count] of Object.entries(emotions)) {
      const pct = (count / total) * 100;

      if (STRESS_EMOTIONS.includes(emotion) && pct > maxStress) {
        maxStress = pct;
        stressCategory = category;
      }
      if (emotion === 'ansiedade' && pct > maxAnxiety) {
        maxAnxiety = pct;
        anxietyCategory = category;
      }
      if (emotion === 'calma' && pct > maxCalm) {
        maxCalm = pct;
        calmSleepCategory = category;
      }
      if (POSITIVE_EMOTIONS.includes(emotion)) {
        const posSum = Object.entries(emotions)
          .filter(([e]) => POSITIVE_EMOTIONS.includes(e))
          .reduce((s, [, c]) => s + c, 0);
        const posPct = (posSum / total) * 100;
        if (posPct > maxPositive) {
          maxPositive = posPct;
          mostPositiveCategory = category;
        }
      }
      if (NEGATIVE_EMOTIONS.includes(emotion)) {
        const negSum = Object.entries(emotions)
          .filter(([e]) => NEGATIVE_EMOTIONS.includes(e))
          .reduce((s, [, c]) => s + c, 0);
        const negPct = (negSum / total) * 100;
        if (negPct > maxNegative) {
          maxNegative = negPct;
          mostNegativeCategory = category;
        }
      }
    }
  }

  // mostFrequent category
  const categoryCounts = {};
  for (const dream of dreams) {
    categoryCounts[dream.dreamCategory] = (categoryCounts[dream.dreamCategory] || 0) + 1;
  }
  const mostFrequentCategory = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    [0]?.[0] ?? null;

  return {
    predominantEmotionByCategory,
    stressCategory,
    anxietyCategory,
    calmSleepCategory,
    mostPositiveCategory,
    mostNegativeCategory,
    mostFrequentCategory,
  };
}

async function getPeriodInfo(userId) {
  const [firstDream, firstEmotion] = await Promise.all([
    Dream.findOne({ userId }).sort({ createdAt: 1 }).select('createdAt').lean(),
    EmotionJournal.findOne({ userId }).sort({ createdAt: 1 }).select('createdAt').lean(),
  ]);

  const firstDreamDate = firstDream?.createdAt;
  const firstEmotionDate = firstEmotion?.createdAt;

  const firstDates = [firstDreamDate, firstEmotionDate].filter(Boolean);
  const earliest = firstDates.length > 0
    ? new Date(Math.min(...firstDates.map((d) => new Date(d).getTime())))
    : null;

  const now = new Date();
  const totalDays = earliest
    ? Math.max(1, Math.ceil((now.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const [dreamCount, emotionCount] = await Promise.all([
    Dream.countDocuments({ userId }),
    EmotionJournal.countDocuments({ userId }),
  ]);

  return {
    totalDays,
    dreamDays: dreamCount > 0 ? null : 0, // placeholder — full precision requires day-level aggregation
    emotionDays: emotionCount > 0 ? null : 0,
  };
}

exports.getAnalytics = async (userId) => {
  const [sleep, dreams, emotions, correlations] = await Promise.all([
    getSleepStats(userId),
    getDreamStats(userId),
    getEmotionStats(userId),
    getCorrelationInsights(userId),
  ]);

  return { sleep, dreams, emotions, correlations };
};
