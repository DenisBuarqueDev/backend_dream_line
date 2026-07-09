const mongoose = require('mongoose');

const UserMemorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  lastUpdated: Date,
  lastCalculation: Date,

  profile: {
    dreamProfile: String,
    dreamScore: {
      score: Number,
      label: String,
    },
    confidence: Number,
  },

  stats: {
    totalDreams: { type: Number, default: 0 },
    totalEmotions: { type: Number, default: 0 },
    totalInterpretations: { type: Number, default: 0 },
    totalDreamImages: { type: Number, default: 0 },
    totalNumerology: { type: Number, default: 0 },
    firstDreamDate: Date,
    lastDreamDate: Date,
    activeDays: { type: Number, default: 0 },
  },

  sono: {
    averageSleep: Number,
    averageBedTime: String,
    averageWakeTime: String,
    sleepTrend: {
      '7d': Number,
      '30d': Number,
      '90d': Number,
      '365d': Number,
    },
  },

  emotions: {
    predominantEmotion: String,
    emotionDistribution: [{
      emotion: String,
      count: Number,
      percentage: Number,
      avgIntensity: Number,
    }],
    emotionalTrend: {
      '7d': Number,
      '30d': Number,
      '90d': Number,
      '365d': Number,
    },
  },

  dreams: {
    predominantCategories: [{
      category: String,
      percentage: Number,
    }],
    recurringPatterns: {
      tematicos: [{ pattern: String, count: Number }],
      espirituais: [{ pattern: String, count: Number }],
      biologicos: [{ pattern: String, count: Number }],
      emocionais: [{ pattern: String, count: Number }],
    },
  },

  tags: {
    topTags: [{ name: String, count: Number }],
    topSymbols: [{ symbol: String, count: Number }],
    topPeople: [{ name: String, count: Number }],
    topPlaces: [{ name: String, count: Number }],
    topAnimals: [{ name: String, count: Number }],
  },

  correlacoes: {
    strongestCorrelations: [{
      category: String,
      emotion: String,
      probability: Number,
    }],
    stressCategory: String,
    anxietyCategory: String,
    calmSleepCategory: String,
    mostPositiveCategory: String,
    mostNegativeCategory: String,
  },

  behavior: {
    averageDreamLength: Number,
    averageEmotionIntensity: Number,
    preferredSleepTime: String,
    consistencyScore: Number,
    engagementScore: Number,
  },

  favorites: {
    favoriteTags: [String],
    favoriteCategories: [String],
    favoriteSymbols: [String],
    favoriteCollections: [String],
  },

  insights: {
    recommendations: [{
      priority: String,
      title: String,
      description: String,
    }],
    warnings: [String],
    positiveHabits: [String],
  },

  resumo: {
    summary: String,
    lastReportDate: Date,
  },

  proactiveInsights: [{
    insightId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['sono', 'emoções', 'sonhos', 'hábitos', 'objetivos', 'saúde', 'padrões', 'evolução'], required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  }],

  adaptiveProfile: {
    preferredResponseStyle: { type: String, enum: ['short', 'medium', 'detailed'], default: 'medium' },
    preferredEmpathyLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    likesContextConnections: { type: Boolean, default: false },
    likesDreamAnalysis: { type: Boolean, default: false },
    likesObjectiveAnswers: { type: Boolean, default: false },
    likesFollowUpQuestions: { type: Boolean, default: false },
    preferredConversationLength: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' },
    updatedAt: { type: Date, default: Date.now },
  },

  personalityProfile: {
    warmth: { type: Number, default: 60, min: 0, max: 100 },
    empathy: { type: Number, default: 70, min: 0, max: 100 },
    curiosity: { type: Number, default: 50, min: 0, max: 100 },
    humor: { type: Number, default: 30, min: 0, max: 100 },
    optimism: { type: Number, default: 55, min: 0, max: 100 },
    directness: { type: Number, default: 40, min: 0, max: 100 },
    playfulness: { type: Number, default: 35, min: 0, max: 100 },
    reflectionLevel: { type: Number, default: 60, min: 0, max: 100 },
    conversationEnergy: { type: Number, default: 50, min: 0, max: 100 },
    updatedAt: { type: Date, default: Date.now },
  },
});

module.exports = mongoose.model('UserMemory', UserMemorySchema);
