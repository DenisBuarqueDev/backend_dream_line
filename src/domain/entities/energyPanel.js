class EnergyOfTheDay {
  constructor({ date, userId, astrology, numerology, sleep, emotions }) {
    this.date = date;
    this.userId = userId;
    this.astrology = astrology;
    this.numerology = numerology;
    this.sleep = sleep;
    this.emotions = emotions;
  }

  getSummary() {
    const elements = [];

    if (this.astrology?.dominantEnergy) {
      elements.push(`🌟 ${this.astrology.dominantEnergy}`);
    }

    if (this.numerology?.lifePath) {
      elements.push(`🔢 Caminho ${this.numerology.lifePath}`);
    }

    if (this.sleep?.quality) {
      elements.push(`😴 Sono ${this.sleep.quality}`);
    }

    if (this.emotions?.dominant) {
      elements.push(`💭 ${this.emotions.dominant}`);
    }

    return elements;
  }

  toJSON() {
    return {
      date: this.date,
      userId: this.userId,
      astrology: this.astrology,
      numerology: this.numerology,
      sleep: this.sleep,
      emotions: this.emotions,
      summary: this.getSummary()
    };
  }
}

class AstrologicalEnergy {
  constructor({ sunSign, moonSign, ascendant, transits, aspects, prediction }) {
    this.sunSign = sunSign;
    this.moonSign = moonSign;
    this.ascendant = ascendant;
    this.transits = transits;
    this.aspects = aspects;
    this.prediction = prediction;
  }

  get dominantEnergy() {
    if (!this.aspects || this.aspects.length === 0) return null;

    const energyCounts = {};
    this.aspects.forEach(a => {
      const energy = a.energy || 'neutral';
      energyCounts[energy] = (energyCounts[energy] || 0) + 1;
    });

    return Object.entries(energyCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }

  get mainAspects() {
    return this.aspects?.slice(0, 3) || [];
  }

  toJSON() {
    return {
      sunSign: this.sunSign,
      moonSign: this.moonSign,
      ascendant: this.ascendant,
      transits: this.transits,
      aspects: this.mainAspects,
      prediction: this.prediction,
      dominantEnergy: this.dominantEnergy
    };
  }
}

class NumerologicalEnergy {
  constructor({ lifePath, personalNumber, universalNumber, message, yearNumber }) {
    this.lifePath = lifePath;
    this.personalNumber = personalNumber;
    this.universalNumber = universalNumber;
    this.message = message;
    this.yearNumber = yearNumber;
  }

  toJSON() {
    return {
      lifePath: this.lifePath,
      personalNumber: this.personalNumber,
      universalNumber: this.universalNumber,
      message: this.message,
      yearNumber: this.yearNumber
    };
  }
}

class SleepData {
  constructor({ lastNight, averageDuration, quality, tips }) {
    this.lastNight = lastNight;
    this.averageDuration = averageDuration;
    this.quality = quality;
    this.tips = tips;
  }

  static calculateQuality(durationHours) {
    if (!durationHours) return 'unknown';
    if (durationHours >= 7 && durationHours <= 9) return 'good';
    if (durationHours >= 6 && durationHours < 7) return 'fair';
    return 'poor';
  }

  static getQualityTips(quality) {
    const tips = {
      good: [
        "Continue mantendo esse padrão de sono.",
        "Seu corpo está bem descansado para aproveitaro dia."
      ],
      fair: [
        "Tente dormir mais 30 minutos na próxima noite.",
        "Evite telas antes de dormir."
      ],
      poor: [
        "Priorize uma rotina de sono consistente.",
        "Considere técnicas de relaxamento antes de dormir."
      ],
      unknown: [
        "Registre seu sono para acompanhar sua qualidade.",
        "Manter um horário fixo ajuda a melhorar o descanso."
      ]
    };
    return tips[quality] || tips.unknown;
  }

  toJSON() {
    return {
      lastNight: this.lastNight,
      averageDuration: this.averageDuration,
      quality: this.quality,
      tips: this.tips
    };
  }
}

class EmotionalState {
  constructor({ recentEmotions, dominant, trend, analysis }) {
    this.recentEmotions = recentEmotions;
    this.dominant = dominant;
    this.trend = trend;
    this.analysis = analysis;
  }

  static categorizeEmotion(category) {
    const categories = {
      joy: { emoji: "😊", label: "Alegria", energy: "positive" },
      sadness: { emoji: "😢", label: "Tristeza", energy: "negative" },
      anxiety: { emoji: "😰", label: "Ansiedade", energy: "negative" },
      anger: { emoji: "😠", label: "Raiva", energy: "negative" },
      love: { emoji: "❤️", label: "Amor", energy: "positive" },
      fear: { emoji: "😨", label: "Medo", energy: "negative" },
      surprise: { emoji: "😲", label: "Surpresa", energy: "neutral" },
      calm: { emoji: "😌", label: "Calma", energy: "positive" },
      excitement: { emoji: "🤩", label: "Emoção", energy: "positive" },
      confusion: { emoji: "😕", label: "Confusão", energy: "neutral" }
    };

    const normalized = category?.toLowerCase().trim() || 'calm';
    return categories[normalized] || { emoji: "😐", label: category || "Neutro", energy: "neutral" };
  }

  toJSON() {
    return {
      recentEmotions: this.recentEmotions,
      dominant: this.dominant,
      trend: this.trend,
      analysis: this.analysis
    };
  }
}

class IntegratedRecommendation {
  constructor({ astrology, numerology, sleep, emotions }) {
    this.astrology = astrology;
    this.numerology = numerology;
    this.sleep = sleep;
    this.emotions = emotions;
  }

  generate() {
    const recommendations = [];

    if (this.numerology?.lifePath === 1 && this.astrology?.dominantEnergy === 'challenge') {
      recommendations.push({
        type: 'action',
        priority: 'high',
        message: "Dia de liderança necessária. Tome a iniciativa mesmo com desafios."
      });
    }

    if (this.numerology?.universalNumber === 5 && this.sleep?.quality === 'poor') {
      recommendations.push({
        type: 'rest',
        priority: 'high',
        message: "尽管今天是 mudança, seu corpo precisa de descanso. Descanse hoje."
      });
    }

    if (this.emotions?.dominant === 'anxiety') {
      recommendations.push({
        type: 'emotional',
        priority: 'medium',
        message: "Transitos indicam tensão. Pratique respiração profunda ou meditação."
      });
    }

    if (this.astrology?.prediction && this.astrology.prediction.length > 0) {
      recommendations.push({
        type: 'astrology',
        priority: 'medium',
        message: this.astrology.prediction[0]
      });
    }

    if (this.sleep?.quality === 'poor') {
      recommendations.push({
        type: 'sleep',
        priority: 'high',
        message: "Priorize sono hoje. Evite telas e cafeina após as 18h."
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'general',
        priority: 'low',
        message: "Dia equilibrado. Mantenha suas rotinas normais."
      });
    }

    return recommendations;
  }

  toJSON() {
    return {
      recommendations: this.generate()
    };
  }
}

module.exports = {
  EnergyOfTheDay,
  AstrologicalEnergy,
  NumerologicalEnergy,
  SleepData,
  EmotionalState,
  IntegratedRecommendation
};