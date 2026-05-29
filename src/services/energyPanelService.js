const AstralChart = require('../models/AstralChart');
const Dream = require('../models/Dream');
const transitService = require('./transitService');
const numerologyService = require('./numerologyService');
const {
  EnergyOfTheDay,
  AstrologicalEnergy,
  NumerologicalEnergy,
  SleepData,
  EmotionalState,
  IntegratedRecommendation
} = require('../domain/entities');

class EnergyPanelService {
  async getEnergyOfTheDay(userId) {
    const currentDate = new Date();
    const dateString = currentDate.toISOString().split('T')[0];

    const chart = await this.#getLatestChart(userId);
    const birthDate = chart?.birthData?.date?.toISOString().split('T')[0];
    const { latitude, longitude } = chart?.birthData?.location || {};

    const [astrologyData, numerologyData, sleepData, emotionsData] = await Promise.all([
      this.#calculateAstrology(chart, latitude, longitude, currentDate),
      this.#calculateNumerology(birthDate, currentDate),
      this.#calculateSleepData(userId),
      this.#calculateEmotions(userId)
    ]);

    const astrology = new AstrologicalEnergy(astrologyData);
    const numerology = new NumerologicalEnergy(numerologyData);
    const sleep = new SleepData(sleepData);
    const emotions = new EmotionalState(emotionsData);

    const energyOfTheDay = new EnergyOfTheDay({
      date: dateString,
      userId,
      astrology: astrology.toJSON(),
      numerology: numerology.toJSON(),
      sleep: sleep.toJSON(),
      emotions: emotions.toJSON()
    });

    const recommendation = new IntegratedRecommendation({
      astrology: astrology.toJSON(),
      numerology: numerology.toJSON(),
      sleep: sleep.toJSON(),
      emotions: emotions.toJSON()
    });

    return {
      ...energyOfTheDay.toJSON(),
      recommendations: recommendation.generate()
    };
  }

  async #getLatestChart(userId) {
    return await AstralChart.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  async #calculateAstrology(chart, latitude, longitude, currentDate) {
    if (!chart || !latitude || !longitude) {
      return {
        sunSign: null,
        moonSign: null,
        ascendant: null,
        transits: {},
        aspects: [],
        prediction: ["Configure seu mapa astral para ver a energia do dia."]
      };
    }

    const transits = transitService.calculateTransits(currentDate, latitude, longitude);

    const natalPlanets = {};
    chart.planets.forEach(planet => {
      natalPlanets[planet.planet] = {
        fullDegree: planet.fullDegree,
        sign: planet.sign
      };
    });

    const aspects = transitService.calculateTransitAspects(transits, natalPlanets);
    const prediction = transitService.generateDailyPrediction(aspects, null);

    return {
      sunSign: chart.sunSign,
      moonSign: chart.moonSign,
      ascendant: chart.ascendant,
      transits,
      aspects,
      prediction
    };
  }

  async #calculateNumerology(birthDate, currentDate) {
    if (!birthDate) {
      return {
        lifePath: null,
        personalNumber: null,
        universalNumber: null,
        message: "Configure seu mapa astral para ver sua numerologia.",
        yearNumber: null
      };
    }

    const currentDateString = currentDate.toISOString();
    const report = numerologyService.generateDailyNumerology(birthDate, currentDateString);
    const yearNumber = numerologyService.calculateYearNumber(birthDate, currentDate.getFullYear());

    return {
      lifePath: report.lifePathNumber,
      personalNumber: report.personalNumber,
      universalNumber: report.universalNumber,
      message: report.combinedMessage,
      yearNumber: yearNumber.number
    };
  }

  async #calculateSleepData(userId) {
    const lastDream = await Dream.findOne({ userId, 'sono.duracaoHoras': { $gt: 0 } })
      .sort({ createdAt: -1 })
      .lean();

    if (!lastDream || !lastDream.sono) {
      return {
        lastNight: null,
        averageDuration: null,
        quality: 'unknown',
        tips: SleepData.getQualityTips('unknown')
      };
    }

    const duration = lastDream.sono.duracaoHoras;
    const quality = SleepData.calculateQuality(duration);
    const tips = SleepData.getQualityTips(quality);

    return {
      lastNight: {
        date: lastDream.createdAt.toISOString().split('T')[0],
        duration: duration,
        wakeTime: lastDream.sono.horaAcordar,
        sleepTime: lastDream.sono.horaDormir
      },
      averageDuration: duration,
      quality,
      tips
    };
  }

  async #calculateEmotions(userId) {
    const recentDreams = await Dream.find({ userId })
      .sort({ createdAt: -1 })
      .limit(7)
      .lean();

    if (!recentDreams || recentDreams.length === 0) {
      return {
        recentEmotions: [],
        dominant: null,
        trend: 'neutral',
        analysis: "Sem dados emocionais recentes. Registre seus sonhos para acompanhar."
      };
    }

    const emotionCounts = {};
    recentDreams.forEach(dream => {
      if (dream.categorias && dream.categorias.length > 0) {
        dream.categorias.forEach(cat => {
          const normalized = cat.toLowerCase().trim();
          emotionCounts[normalized] = (emotionCounts[normalized] || 0) + 1;
        });
      }
    });

    const sortedEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1]);

    const dominant = sortedEmotions[0]?.[0] || null;
    const dominantLabel = EmotionalState.categorizeEmotion(dominant);

    const recentEmotions = sortedEmotions.slice(0, 3).map(([emotion, count]) => ({
      emotion,
      count,
      ...EmotionalState.categorizeEmotion(emotion)
    }));

    const trend = this.#calculateEmotionTrend(recentDreams);

    const analysis = this.#generateEmotionAnalysis(dominantLabel, trend);

    return {
      recentEmotions,
      dominant: dominantLabel.label,
      trend,
      analysis
    };
  }

  #calculateEmotionTrend(dreams) {
    if (dreams.length < 3) return 'neutral';

    const recentThree = dreams.slice(0, 3);
    let positiveCount = 0;
    let negativeCount = 0;

    recentThree.forEach(dream => {
      if (dream.categorias) {
        dream.categorias.forEach(cat => {
          const catLower = cat.toLowerCase();
          if (['joy', 'love', 'calm', 'excitement'].includes(catLower)) {
            positiveCount++;
          } else if (['sadness', 'anxiety', 'anger', 'fear'].includes(catLower)) {
            negativeCount++;
          }
        });
      }
    });

    if (positiveCount > negativeCount) return 'improving';
    if (negativeCount > positiveCount) return 'declining';
    return 'stable';
  }

  #generateEmotionAnalysis(dominantLabel, trend) {
    const analyses = {
      improving: "Seus sonhos recentes indicam uma tendência positiva. Continue assim!",
      declining: "Período emocional desafiador. Seja gentil consigo mesmo.",
      stable: "Estado emocional equilibrado. Mantenha suas rotinas."
    };

    return analyses[trend] || "Analise seus sonhos para compreender melhor.";
  }

  async getWeeklyEnergy(userId, days = 7) {
    const predictions = [];
    const currentDate = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);

      const dayPrediction = await this.#getDayPrediction(userId, date);
      predictions.push(dayPrediction);
    }

    const summary = this.#generateWeeklySummary(predictions);

    return {
      period: {
        start: predictions[0]?.date,
        end: predictions[days - 1]?.date
      },
      dailyPredictions: predictions,
      summary
    };
  }

  async #getDayPrediction(userId, date) {
    const dateString = date.toISOString().split('T')[0];

    const chart = await this.#getLatestChart(userId);
    const birthDate = chart?.birthData?.date?.toISOString().split('T')[0];

    let transits = null;
    let aspects = [];
    if (chart?.birthData?.location) {
      transits = transitService.calculateTransits(date, chart.birthData.location.latitude, chart.birthData.location.longitude);

      const natalPlanets = {};
      chart.planets.forEach(planet => {
        natalPlanets[planet.planet] = { fullDegree: planet.fullDegree, sign: planet.sign };
      });

      aspects = transitService.calculateTransitAspects(transits, natalPlanets);
    }

    let numerology = null;
    if (birthDate) {
      numerology = numerologyService.generateDailyNumerology(birthDate, date.toISOString());
    }

    const prediction = transits && aspects.length > 0
      ? transitService.generateDailyPrediction(aspects, null)
      : numerology?.combinedMessage
        ? [numerology.combinedMessage]
        : ["Dia de equilibrio e planejamento."];

    return {
      date: dateString,
      transits: transits ? Object.keys(transits).length : 0,
      aspectsCount: aspects.length,
      prediction: prediction[0] || "Dia neutro."
    };
  }

  #generateWeeklySummary(predictions) {
    const aspectsCounts = predictions.map(p => p.aspectsCount);
    const avgAspects = aspectsCounts.reduce((a, b) => a + b, 0) / aspectsCounts.length;

    if (avgAspects > 3) {
      return "Semana com forte atividade astrológica. Expectativas elevadas e múltiplos aspect os em formação.";
    } else if (avgAspects > 1) {
      return "Semana com atividade moderada. Bom período para ações práticas e decisões equilibradas.";
    } else {
      return "Semana tranquila energeticamente. Bom momento para reflexão e planejamento.";
    }
  }
}

const energyPanelService = new EnergyPanelService();

module.exports = energyPanelService;