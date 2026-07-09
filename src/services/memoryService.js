const UserMemory = require('../models/UserMemory');
const Dream = require('../models/Dream');
const Favorite = require('../models/Favorite');
const Collection = require('../models/Collection');
const analyticsService = require('./analyticsService');
const mongoose = require('mongoose');
const reportService = require('./reportService');

function addOrIncrement(arr, key, valueField = 'name', countField = 'count') {
  const existing = arr.find(item => item[valueField] === key);
  if (existing) {
    existing[countField] += 1;
  } else {
    arr.push({ [valueField]: key, [countField]: 1 });
  }
}

async function ensureMemory(userId) {
  let memory = await UserMemory.findOne({ userId });
  if (!memory) {
    memory = await UserMemory.create({ userId });
  }
  return memory;
}

async function updateOnNewDream(userId, dream) {
  try {
    const memory = await ensureMemory(userId);

    memory.stats.totalDreams = (memory.stats.totalDreams || 0) + 1;

    if (dream.interpretacao) {
      memory.stats.totalInterpretations = (memory.stats.totalInterpretations || 0) + 1;
    }

    if (dream.imageUrl) {
      memory.stats.totalDreamImages = (memory.stats.totalDreamImages || 0) + 1;
    }

    if (dream.dreamNumerology) {
      memory.stats.totalNumerology = (memory.stats.totalNumerology || 0) + 1;
    }

    if (!memory.stats.firstDreamDate) {
      memory.stats.firstDreamDate = dream.createdAt || new Date();
    }
    memory.stats.lastDreamDate = dream.createdAt || new Date();

    const dreamLen = (dream.textoSonho || '').length;
    const prevDreams = memory.stats.totalDreams - 1;
    if (prevDreams > 0 && memory.behavior.averageDreamLength != null) {
      memory.behavior.averageDreamLength = Math.round(
        ((memory.behavior.averageDreamLength * prevDreams) + dreamLen) / memory.stats.totalDreams * 10,
      ) / 10;
    } else {
      memory.behavior.averageDreamLength = dreamLen;
    }

    if (dream.tags && Array.isArray(dream.tags)) {
      for (const tag of dream.tags) {
        if (tag.type === 'Pessoa') {
          addOrIncrement(memory.tags.topPeople, tag.name, 'name', 'count');
        } else if (tag.type === 'Lugar') {
          addOrIncrement(memory.tags.topPlaces, tag.name, 'name', 'count');
        } else if (tag.type === 'Animal') {
          addOrIncrement(memory.tags.topAnimals, tag.name, 'name', 'count');
        } else {
          addOrIncrement(memory.tags.topTags, tag.name, 'name', 'count');
        }
      }
    }

    if (dream.aiData && dream.aiData.symbols && Array.isArray(dream.aiData.symbols)) {
      for (const sym of dream.aiData.symbols) {
        if (sym && sym.symbol) {
          addOrIncrement(memory.tags.topSymbols, sym.symbol, 'symbol', 'count');
        }
      }
    }

    if (dream.dreamCategory) {
      addOrIncrement(memory.dreams.predominantCategories, dream.dreamCategory, 'category', 'count');
    }

    // Truncate arrays to prevent unbounded growth
    memory.tags.topTags.sort((a, b) => b.count - a.count);
    if (memory.tags.topTags.length > 20) memory.tags.topTags = memory.tags.topTags.slice(0, 20);
    memory.tags.topSymbols.sort((a, b) => b.count - a.count);
    if (memory.tags.topSymbols.length > 20) memory.tags.topSymbols = memory.tags.topSymbols.slice(0, 20);
    memory.tags.topPeople.sort((a, b) => b.count - a.count);
    if (memory.tags.topPeople.length > 10) memory.tags.topPeople = memory.tags.topPeople.slice(0, 10);
    memory.tags.topPlaces.sort((a, b) => b.count - a.count);
    if (memory.tags.topPlaces.length > 10) memory.tags.topPlaces = memory.tags.topPlaces.slice(0, 10);
    memory.tags.topAnimals.sort((a, b) => b.count - a.count);
    if (memory.tags.topAnimals.length > 10) memory.tags.topAnimals = memory.tags.topAnimals.slice(0, 10);
    memory.dreams.predominantCategories.sort((a, b) => b.count - a.count);
    if (memory.dreams.predominantCategories.length > 5) memory.dreams.predominantCategories = memory.dreams.predominantCategories.slice(0, 5);

    if (dream.sono && dream.sono.duracaoHoras != null) {
      const currentTotal = memory.stats.totalDreams;
      const prevCount = currentTotal - 1;
      if (prevCount > 0 && memory.sono.averageSleep != null) {
        memory.sono.averageSleep = Math.round(
          ((memory.sono.averageSleep * prevCount) + dream.sono.duracaoHoras) / currentTotal * 10,
        ) / 10;
      } else {
        memory.sono.averageSleep = dream.sono.duracaoHoras;
      }

      if (dream.sono.horaDormir) {
        memory.behavior.preferredSleepTime = dream.sono.horaDormir;
        memory.sono.averageBedTime = dream.sono.horaDormir;
      }
      if (dream.sono.horaAcordar) {
        memory.sono.averageWakeTime = dream.sono.horaAcordar;
      }
    }

    memory.lastUpdated = new Date();
    await memory.save();
  } catch (error) {
    console.error('[MemoryEngine] updateOnNewDream error:', error.message);
  }
}

// Reinterpretations only update lastUpdated to acknowledge the activity.
// Full stat recalculation (tags, symbols, categories, correlations, etc.)
// happens during the next Analytics or Report generation.
// This keeps reinterpretations lightweight and non-blocking.
async function updateOnReinterpret(userId) {
  try {
    const memory = await ensureMemory(userId);
    memory.lastUpdated = new Date();
    await memory.save();
  } catch (error) {
    console.error('[MemoryEngine] updateOnReinterpret error:', error.message);
  }
}

async function updateOnNewEmotion(userId, emotion) {
  try {
    const memory = await ensureMemory(userId);

    memory.stats.totalEmotions = (memory.stats.totalEmotions || 0) + 1;

    const dist = memory.emotions.emotionDistribution || [];
    const existing = dist.find(e => e.emotion === emotion.emotion);
    if (existing) {
      const prevCount = existing.count;
      existing.count += 1;
      existing.avgIntensity = Math.round(
        ((existing.avgIntensity * prevCount) + emotion.intensity) / existing.count * 10,
      ) / 10;
    } else {
      dist.push({
        emotion: emotion.emotion,
        count: 1,
        percentage: 0,
        avgIntensity: emotion.intensity,
      });
    }

    dist.sort((a, b) => b.count - a.count);
    const total = dist.reduce((s, e) => s + e.count, 0);
    for (const e of dist) {
      e.percentage = Math.round((e.count / total) * 100);
    }

    memory.emotions.emotionDistribution = dist;
    memory.emotions.predominantEmotion = dist.length > 0 ? dist[0].emotion : null;

    const prevEmotions = memory.stats.totalEmotions - 1;
    if (prevEmotions > 0 && memory.behavior.averageEmotionIntensity != null) {
      memory.behavior.averageEmotionIntensity = Math.round(
        ((memory.behavior.averageEmotionIntensity * prevEmotions) + emotion.intensity) / memory.stats.totalEmotions * 10,
      ) / 10;
    } else {
      memory.behavior.averageEmotionIntensity = emotion.intensity;
    }

    memory.lastUpdated = new Date();
    await memory.save();
  } catch (error) {
    console.error('[MemoryEngine] updateOnNewEmotion error:', error.message);
  }
}

async function buildFavorites(userId) {
  try {
    const favorites = await Favorite.find({ userId }).select('dreamId').lean();
    const dreamIds = favorites.map(f => f.dreamId).filter(Boolean);
    const collections = await Collection.find({ userId }).select('name').lean();

    const favoriteTags = [];
    const favoriteCategories = [];
    const favoriteSymbols = [];
    const collectionNames = collections.map(c => c.name);

    if (dreamIds.length > 0) {
      const dreams = await Dream.find({ _id: { $in: dreamIds } })
        .select('tags dreamCategory aiData.symbols')
        .lean();

      for (const dream of dreams) {
        if (dream.tags) {
          for (const tag of dream.tags) {
            if (!favoriteTags.includes(tag.name)) favoriteTags.push(tag.name);
          }
        }
        if (dream.dreamCategory && !favoriteCategories.includes(dream.dreamCategory)) {
          favoriteCategories.push(dream.dreamCategory);
        }
        if (dream.aiData && dream.aiData.symbols) {
          for (const sym of dream.aiData.symbols) {
            if (sym && sym.symbol && !favoriteSymbols.includes(sym.symbol)) {
              favoriteSymbols.push(sym.symbol);
            }
          }
        }
      }
    }

    return {
      favoriteTags,
      favoriteCategories,
      favoriteSymbols,
      favoriteCollections: collectionNames,
    };
  } catch (error) {
    console.error('[MemoryEngine] buildFavorites error:', error.message);
    return { favoriteTags: [], favoriteCategories: [], favoriteSymbols: [], favoriteCollections: [] };
  }
}

function calculateEngagementScore(stats) {
  let score = 0;
  score += Math.min(30, (stats.totalDreams || 0) * 2);
  score += Math.min(25, (stats.totalEmotions || 0) * 1.5);
  score += Math.min(20, (stats.totalInterpretations || 0) * 2);
  score += Math.min(15, (stats.totalDreamImages || 0) * 5);
  score += Math.min(10, (stats.totalNumerology || 0) * 3);
  return Math.round(Math.min(100, score));
}

async function updateOnAnalytics(userId) {
  try {
    const analytics = await analyticsService.getAnalytics(userId);
    const memory = await ensureMemory(userId);

    if (analytics.sleep) {
      if (analytics.sleep.avgSleepHours != null) memory.sono.averageSleep = analytics.sleep.avgSleepHours;
      if (analytics.sleep.avgBedTime != null) memory.sono.averageBedTime = analytics.sleep.avgBedTime;
      if (analytics.sleep.avgWakeTime != null) memory.sono.averageWakeTime = analytics.sleep.avgWakeTime;
      if (analytics.sleep.trend) memory.sono.sleepTrend = analytics.sleep.trend;
    }

    if (analytics.dreams) {
      const dreamCategories = (analytics.dreams.categories || []).map(c => ({
        category: c.category,
        percentage: c.percentage,
      }));
      memory.dreams.predominantCategories = dreamCategories;
      memory.dreams.recurringPatterns = analytics.dreams.patterns || { tematicos: [], espirituais: [], biologicos: [], emocionais: [] };
    }

    if (analytics.emotions) {
      memory.emotions.predominantEmotion = analytics.emotions.predominant;
      memory.emotions.emotionDistribution = (analytics.emotions.distribution || []).map(d => ({
        emotion: d.emotion,
        count: d.count,
        percentage: d.percentage,
        avgIntensity: d.avgIntensity,
      }));
      memory.emotions.emotionalTrend = analytics.emotions.intensityTrend || {};
    }

    if (analytics.correlations) {
      memory.correlacoes.strongestCorrelations = analytics.correlations.predominantEmotionByCategory || [];
      memory.correlacoes.stressCategory = analytics.correlations.stressCategory || null;
      memory.correlacoes.anxietyCategory = analytics.correlations.anxietyCategory || null;
      memory.correlacoes.calmSleepCategory = analytics.correlations.calmSleepCategory || null;
      memory.correlacoes.mostPositiveCategory = analytics.correlations.mostPositiveCategory || null;
      memory.correlacoes.mostNegativeCategory = analytics.correlations.mostNegativeCategory || null;
    }

    // Use targeted aggregations instead of loading all dreams/emotions
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const [dreamMeta, tagsAgg, symbolsAgg, peopleAgg, placesAgg, animalsAgg, dreamDates, emotionDates] = await Promise.all([
      Dream.aggregate([
        { $match: { userId: userIdObj } },
        {
          $group: {
            _id: null,
            totalInterpretations: { $sum: { $cond: [{ $ne: ['$interpretacao', null] }, 1, 0] } },
            totalDreamImages: { $sum: { $cond: [{ $ne: ['$imageUrl', null] }, 1, 0] } },
            totalNumerology: { $sum: { $cond: [{ $ne: ['$dreamNumerology', null] }, 1, 0] } },
            avgLength: { $avg: { $strLenCP: { $ifNull: ['$textoSonho', ''] } } },
            firstDate: { $min: '$createdAt' },
            lastDate: { $max: '$createdAt' },
          },
        },
      ]),
      Dream.aggregate([
        { $match: { userId: userIdObj } },
        { $unwind: { path: '$tags', preserveNullAndEmptyArrays: false } },
        { $match: { 'tags.type': { $nin: ['Pessoa', 'Lugar', 'Animal'] } } },
        { $group: { _id: '$tags.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
        { $project: { name: '$_id', count: 1, _id: 0 } },
      ]),
      Dream.aggregate([
        { $match: { userId: userIdObj } },
        { $unwind: { path: '$aiData.symbols', preserveNullAndEmptyArrays: false } },
        { $match: { 'aiData.symbols.symbol': { $ne: null } } },
        { $group: { _id: '$aiData.symbols.symbol', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
        { $project: { symbol: '$_id', count: 1, _id: 0 } },
      ]),
      Dream.aggregate([
        { $match: { userId: userIdObj } },
        { $unwind: { path: '$tags', preserveNullAndEmptyArrays: false } },
        { $match: { 'tags.type': 'Pessoa' } },
        { $group: { _id: '$tags.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { name: '$_id', count: 1, _id: 0 } },
      ]),
      Dream.aggregate([
        { $match: { userId: userIdObj } },
        { $unwind: { path: '$tags', preserveNullAndEmptyArrays: false } },
        { $match: { 'tags.type': 'Lugar' } },
        { $group: { _id: '$tags.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { name: '$_id', count: 1, _id: 0 } },
      ]),
      Dream.aggregate([
        { $match: { userId: userIdObj } },
        { $unwind: { path: '$tags', preserveNullAndEmptyArrays: false } },
        { $match: { 'tags.type': 'Animal' } },
        { $group: { _id: '$tags.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { name: '$_id', count: 1, _id: 0 } },
      ]),
      Dream.aggregate([
        { $match: { userId: userIdObj } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
      ]),
      require('../models/EmotionJournal').aggregate([
        { $match: { userId: userIdObj } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
      ]),
    ]);

    const dm = dreamMeta[0] || {};
    memory.stats.totalDreams = analytics.dreams?.total ?? 0;
    memory.stats.totalEmotions = analytics.emotions?.total ?? 0;
    memory.stats.totalInterpretations = dm.totalInterpretations || 0;
    memory.stats.totalDreamImages = dm.totalDreamImages || 0;
    memory.stats.totalNumerology = dm.totalNumerology || 0;
    memory.stats.firstDreamDate = dm.firstDate || null;
    memory.stats.lastDreamDate = dm.lastDate || null;
    memory.behavior.averageDreamLength = dm.avgLength != null ? Math.round(dm.avgLength * 10) / 10 : null;

    const allDates = new Set([
      ...dreamDates.map(d => d._id),
      ...emotionDates.map(d => d._id),
    ]);
    memory.stats.activeDays = allDates.size;
    const totalDays = Math.max(1, Math.ceil(
      (new Date().getTime() - (memory.stats.firstDreamDate
        ? new Date(memory.stats.firstDreamDate).getTime()
        : new Date().getTime() - 86400000)) / 86400000,
    ));
    memory.behavior.consistencyScore = Math.round(Math.min(100, (allDates.size / Math.max(1, totalDays)) * 100));
    memory.behavior.engagementScore = calculateEngagementScore(memory.stats);

    memory.tags.topTags = tagsAgg;
    memory.tags.topSymbols = symbolsAgg;
    memory.tags.topPeople = peopleAgg;
    memory.tags.topPlaces = placesAgg;
    memory.tags.topAnimals = animalsAgg;

    if (analytics.emotions?.averageIntensity != null) {
      memory.behavior.averageEmotionIntensity = analytics.emotions.averageIntensity;
    }

    const favs = await buildFavorites(userId);
    memory.favorites = favs;

    memory.lastCalculation = new Date();
    memory.lastUpdated = new Date();
    await memory.save();
  } catch (error) {
    console.error('[MemoryEngine] updateOnAnalytics error:', error.message);
  }
}

async function updateOnReport(userId) {
  try {
    const report = await reportService.generateReport(userId);
    const memory = await ensureMemory(userId);

    if (report.profile) {
      memory.profile.dreamProfile = report.profile.type || null;
      memory.profile.confidence = report.profile.confidence || null;
    }

    if (report.dreamScore) {
      memory.profile.dreamScore = {
        score: report.dreamScore.score || 0,
        label: report.dreamScore.label || null,
      };
    }

    if (report.recommendations) {
      memory.insights.recommendations = report.recommendations.slice(0, 10);
    }

    const warnings = [];
    if (report.evolution?.emotional?.status === 'declining') {
      warnings.push('Sua intensidade emocional tem aumentado. Considere práticas de autocuidado.');
    }
    if (report.evolution?.sleep?.status === 'declining') {
      warnings.push('Sua qualidade de sono está diminuindo. Tente regular sua rotina noturna.');
    }
    if (report.evolution?.dreams?.status === 'declining') {
      warnings.push('Seus registros de sonhos estão diminuindo. Manter a consistência ajuda nos insights.');
    }
    memory.insights.warnings = warnings;

    const habits = [];
    if (report.evolution?.emotional?.status === 'improving') {
      habits.push('Melhora na estabilidade emocional');
    }
    if (report.evolution?.sleep?.status === 'improving') {
      habits.push('Melhora na qualidade do sono');
    }
    if (report.evolution?.dreams?.status === 'improving') {
      habits.push('Aumento no engajamento com registros de sonhos');
    }
    if (report.profile?.characteristics) {
      for (const char of report.profile.characteristics.slice(0, 2)) {
        if (!habits.includes(char)) habits.push(char);
      }
    }
    memory.insights.positiveHabits = habits;

    if (report.summary) {
      memory.resumo.summary = report.summary;
    }
    memory.resumo.lastReportDate = new Date();

    memory.lastCalculation = new Date();
    memory.lastUpdated = new Date();
    await memory.save();
  } catch (error) {
    console.error('[MemoryEngine] updateOnReport error:', error.message);
  }
}

async function getMemory(userId) {
  try {
    const memory = await UserMemory.findOne({ userId });
    if (!memory) {
      return await ensureMemory(userId);
    }
    return memory;
  } catch (error) {
    console.error('[MemoryEngine] getMemory error:', error.message);
    return null;
  }
}

module.exports = {
  updateOnNewDream,
  updateOnReinterpret,
  updateOnNewEmotion,
  updateOnAnalytics,
  updateOnReport,
  getMemory,
  ensureMemory,
};
