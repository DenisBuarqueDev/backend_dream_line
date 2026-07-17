const Dream = require('../models/Dream');
const EmotionJournal = require('../models/EmotionJournal');

function getWeekRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

exports.getDashboardData = async (userId, user) => {
  const { start: weekStart, end: weekEnd } = getWeekRange();

  const [dreams, emotions, allDreamsCount, allInterpretationsCount, allEmotionsCount, lastEmotionRaw, recentDreamsRaw, recentEmotionsRaw] = await Promise.all([
    Dream.find({
      userId,
      createdAt: { $gte: weekStart, $lte: weekEnd },
    })
      .sort({ createdAt: -1 })
      .lean(),
    EmotionJournal.find({
      userId,
      createdAt: { $gte: weekStart, $lte: weekEnd },
    })
      .sort({ createdAt: 1 })
      .lean(),
    Dream.countDocuments({ userId }),
    Dream.countDocuments({ userId, interpretacao: { $ne: null } }),
    EmotionJournal.countDocuments({ userId }),
    EmotionJournal.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean(),
    Dream.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('textoSonho dreamCategory createdAt')
      .lean(),
    EmotionJournal.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean(),
  ]);

  const lastDreamRaw = await Dream.findOne({ userId })
    .sort({ createdAt: -1 })
    .select('textoSonho dreamCategory interpretacao createdAt')
    .lean();

  let avgSleepHours = null;
  const dreamsWithSleep = dreams.filter((d) => d.sono?.duracaoHoras);
  if (dreamsWithSleep.length > 0) {
    avgSleepHours = +(
      dreamsWithSleep.reduce((acc, d) => acc + d.sono.duracaoHoras, 0) /
      dreamsWithSleep.length
    ).toFixed(1);
  }

  const emotionalByDay = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    emotionalByDay[key] = [];
  }

  for (const emotion of emotions) {
    const key = emotion.createdAt.toISOString().split('T')[0];
    if (emotionalByDay[key]) {
      emotionalByDay[key].push(emotion);
    }
  }

  const emotionalData = Object.entries(emotionalByDay).map(([date, items]) => {
    const d = new Date(date);
    const dayLabel = DAY_LABELS[d.getDay()];
    const dominantEmotion =
      items.length > 0
        ? items
            .sort((a, b) => b.intensity - a.intensity)
            .map((e) => e.emotion)[0]
        : null;
    const averageIntensity =
      items.length > 0
        ? +(
            items.reduce((acc, e) => acc + e.intensity, 0) / items.length
          ).toFixed(1)
        : 0;
    const score = averageIntensity > 0 ? +(averageIntensity / 10).toFixed(2) : 0;

    return { date, dayLabel, dominantEmotion, averageIntensity, score };
  });

  const totalDreams = dreams.length;
  const totalInterpretations = dreams.filter((d) => d.interpretacao).length;
  const totalEmotions = emotions.length;

  let planInfo = {};
  if (user) {
    const UserModel = require('../models/User');
    const tempUser = new UserModel(user);
    planInfo = tempUser.checkUserPlan();
  }

  const lastDream = lastDreamRaw
    ? {
        id: lastDreamRaw._id.toString(),
        textoSonho: lastDreamRaw.textoSonho,
        dreamCategory: lastDreamRaw.dreamCategory || 'Outros',
        interpretacao: lastDreamRaw.interpretacao || null,
        createdAt: lastDreamRaw.createdAt,
        imageUrl: lastDreamRaw.imageUrl || null,
      }
    : null;

  const lastEmotion = lastEmotionRaw
    ? {
        id: lastEmotionRaw._id.toString(),
        emotion: lastEmotionRaw.emotion,
        intensity: lastEmotionRaw.intensity,
        createdAt: lastEmotionRaw.createdAt,
      }
    : null;

  const recentDreams = recentDreamsRaw.map((d) => ({
    _id: d._id.toString(),
    textoSonho: d.textoSonho,
    dreamCategory: d.dreamCategory || 'Outros',
    createdAt: d.createdAt,
  }));

  const recentEmotions = recentEmotionsRaw.map((e) => ({
    _id: e._id.toString(),
    emotion: e.emotion,
    intensity: e.intensity,
    createdAt: e.createdAt,
  }));

  const moodCounts = {};
  for (const day of emotionalData) {
    if (day.dominantEmotion) {
      moodCounts[day.dominantEmotion] = (moodCounts[day.dominantEmotion] || 0) + 1;
    }
  }
  const moodEntries = Object.entries(moodCounts);
  const predominantMood = moodEntries.length > 0
    ? moodEntries.sort((a, b) => b[1] - a[1])[0][0]
    : null;

  return {
    planInfo,
    lastDream,
    lastEmotion,
    stats: {
      totalDreams: allDreamsCount,
      totalInterpretations: allInterpretationsCount,
      totalEmotions: allEmotionsCount,
    },
    weeklySummary: {
      totalDreams,
      totalInterpretations,
      totalEmotions,
      avgSleepHours,
    },
    emotionalData,
    recentDreams,
    recentEmotions,
    predominantMood,
    streak: null,
  };
};
