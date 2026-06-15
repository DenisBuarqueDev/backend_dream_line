const mongoose = require('mongoose');
const EmotionJournal = require('../models/EmotionJournal');
const { successResponse } = require('../utils/response');

const POSITIVE_EMOTIONS = [
  'Alegria', 'Amor', 'Esperança', 'Gratidão', 'Calma', 'Paz',
  'Motivação', 'Inspiração', 'Felicidade', 'Tranquilidade', 'Confiança',
  'Satisfação', 'Orgulho', 'Empatia', 'Compaixão', 'Serenidade',
];

function isPositive(emotion) {
  return POSITIVE_EMOTIONS.some(e => emotion.toLowerCase().includes(e.toLowerCase()));
}

function generateInsights(emotionDistribution, avgIntensity, totalCount, last7, prev7, weeklyData) {
  const insights = [];
  const total = emotionDistribution.reduce((s, e) => s + e.count, 0);

  if (total > 0) {
    const top = emotionDistribution[0];
    const pct = ((top.count / total) * 100).toFixed(0);
    insights.push({
      type: 'predominance',
      message: `${top._id} representa ${pct}% dos seus registros emocionais.`,
      icon: '📊',
    });
  }

  const recentPositive = last7.filter(e => isPositive(e.emotion));
  const recentPositivePct = last7.length > 0 ? (recentPositive.length / last7.length) * 100 : 0;
  const prevPositive = prev7.filter(e => isPositive(e.emotion));
  const prevPositivePct = prev7.length > 0 ? (prevPositive.length / prev7.length) * 100 : 0;

  if (last7.length > 0 && prev7.length > 0) {
    if (recentPositivePct > prevPositivePct) {
      insights.push({
        type: 'positive_trend',
        message: 'Você registrou emoções positivas com mais frequência nos últimos 7 dias.',
        icon: '🌟',
      });
    } else if (recentPositivePct < prevPositivePct) {
      insights.push({
        type: 'negative_trend',
        message: 'Suas emoções positivas diminuíram nos últimos 7 dias. Que tal praticar autocuidado?',
        icon: '🤗',
      });
    }
  }

  if (last7.length > 0 && prev7.length > 0) {
    const lastAvg = last7.reduce((s, e) => s + e.intensity, 0) / last7.length;
    const prevAvg = prev7.reduce((s, e) => s + e.intensity, 0) / prev7.length;

    if (lastAvg < prevAvg - 0.5) {
      insights.push({
        type: 'intensity_drop',
        message: `Seu nível emocional médio diminuiu (de ${prevAvg.toFixed(1)} para ${lastAvg.toFixed(1)}).`,
        icon: '📉',
      });
    } else if (lastAvg > prevAvg + 0.5) {
      insights.push({
        type: 'intensity_rise',
        message: `Seu nível emocional médio aumentou (de ${prevAvg.toFixed(1)} para ${lastAvg.toFixed(1)}).`,
        icon: '📈',
      });
    }
  }

  if (weeklyData.length >= 2) {
    const lastWeek = weeklyData[0];
    const prevWeek = weeklyData[1];
    if (lastWeek && prevWeek && lastWeek.count > prevWeek.count) {
      insights.push({
        type: 'frequency_up',
        message: 'Você tem registrado suas emoções com mais frequência. Continue assim!',
        icon: '📝',
      });
    }
  }

  if (totalCount > 0 && totalCount < 5) {
    insights.push({
      type: 'beginner',
      message: 'Comece a registrar regularmente para descobrir padrões emocionais.',
      icon: '🌱',
    });
  }

  if (avgIntensity > 7) {
    insights.push({
      type: 'high_intensity',
      message: 'Suas emoções têm sido intensas. Considere momentos de pausa e respiração.',
      icon: '🧘',
    });
  }

  return insights;
}

exports.getInsights = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalCount,
      emotionDistribution,
      avgIntensityResult,
      weeklyFrequency,
      monthlyFrequency,
      dailyIntensity,
      last7Records,
      prev7Records,
    ] = await Promise.all([
      EmotionJournal.countDocuments({ userId: req.userId }),

      EmotionJournal.aggregate([
        { $match: { userId } },
        { $group: { _id: '$emotion', count: { $sum: 1 }, avgIntensity: { $avg: '$intensity' } } },
        { $sort: { count: -1 } },
      ]),

      EmotionJournal.aggregate([
        { $match: { userId } },
        { $group: { _id: null, avg: { $avg: '$intensity' } } },
      ]),

      EmotionJournal.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } },
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' },
            startDate: { $min: '$createdAt' },
          },
        },
        { $sort: { '_id.year': -1, '_id.week': -1 } },
        { $limit: 12 },
      ]),

      EmotionJournal.aggregate([
        { $match: { userId } },
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
            userId,
            createdAt: { $gte: thirtyDaysAgo(now) },
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

      EmotionJournal.find({
        userId: req.userId,
        createdAt: { $gte: sevenDaysAgo },
      })
        .select('emotion intensity createdAt')
        .lean(),

      EmotionJournal.find({
        userId: req.userId,
        createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
      })
        .select('emotion intensity createdAt')
        .lean(),
    ]);

    const avgIntensity = avgIntensityResult.length > 0
      ? Math.round(avgIntensityResult[0].avg * 10) / 10
      : 0;

    const insights = generateInsights(
      emotionDistribution,
      avgIntensity,
      totalCount,
      last7Records,
      prev7Records,
      weeklyFrequency
    );

    successResponse(res, {
      totalCount,
      avgIntensity,
      predominantEmotion: emotionDistribution.length > 0 ? emotionDistribution[0]._id : null,
      predominantPct: emotionDistribution.length > 0
        ? Math.round((emotionDistribution[0].count / totalCount) * 100)
        : 0,
      emotionDistribution: emotionDistribution.map(e => ({
        emotion: e._id,
        count: e.count,
        percentage: Math.round((e.count / totalCount) * 100),
        avgIntensity: Math.round(e.avgIntensity * 10) / 10,
      })),
      weeklyFrequency: weeklyFrequency.map(w => ({
        year: w._id.year,
        week: w._id.week,
        count: w.count,
        avgIntensity: Math.round(w.avgIntensity * 10) / 10,
        startDate: w.startDate,
      })),
      monthlyFrequency: monthlyFrequency.map(m => ({
        year: m._id.year,
        month: m._id.month,
        count: m.count,
        avgIntensity: Math.round(m.avgIntensity * 10) / 10,
      })),
      dailyIntensity: dailyIntensity.map(d => ({
        date: d.date,
        avgIntensity: Math.round(d.avgIntensity * 10) / 10,
        count: d.count,
      })),
      temporalComparison: {
        last7Days: {
          count: last7Records.length,
          avgIntensity: last7Records.length > 0
            ? Math.round((last7Records.reduce((s, e) => s + e.intensity, 0) / last7Records.length) * 10) / 10
            : 0,
          topEmotions: getTopEmotions(last7Records),
        },
        prev7Days: {
          count: prev7Records.length,
          avgIntensity: prev7Records.length > 0
            ? Math.round((prev7Records.reduce((s, e) => s + e.intensity, 0) / prev7Records.length) * 10) / 10
            : 0,
          topEmotions: getTopEmotions(prev7Records),
        },
      },
      insights,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const [emotionDistribution, weeklyFrequency, monthlyFrequency] = await Promise.all([
      EmotionJournal.aggregate([
        { $match: { userId } },
        { $group: { _id: '$emotion', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      EmotionJournal.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } },
            count: { $sum: 1 },
            startDate: { $min: '$createdAt' },
          },
        },
        { $sort: { '_id.year': -1, '_id.week': -1 } },
        { $limit: 12 },
      ]),

      EmotionJournal.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
    ]);

    successResponse(res, {
      emotionDistribution,
      weeklyFrequency,
      monthlyFrequency,
    });
  } catch (error) {
    next(error);
  }
};

function thirtyDaysAgo(now) {
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

function getTopEmotions(records) {
  const freq = {};
  records.forEach(r => {
    freq[r.emotion] = (freq[r.emotion] || 0) + 1;
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion, count]) => ({ emotion, count }));
}
