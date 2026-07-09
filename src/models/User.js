const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PLAN_LIMITS = {
  free: {
    maxDreams: 1,
    maxAstralCharts: 1,
    canGenerateImage: false,
    canUseSleepMode: false,
    canSeeWeeklySummary: false,
    canGetFullInterpretation: false,
    maxInterpretationsPerDay: 1,
    maxEmotionAnalysesPerDay: 3,
    canDeleteDream: false,
    canDeleteEmotion: false,
    canUseCorrelations: false,
    canUseNotifications: true,
    canUseNumerology: false,
    maxNameNumerologiesPerDay: 1
  },
  premium: {
    maxDreams: 3,
    maxAstralCharts: Infinity,
    canGenerateImage: true,
    canUseSleepMode: true,
    canSeeWeeklySummary: true,
    canGetFullInterpretation: true,
    maxInterpretationsPerDay: Infinity,
    maxEmotionAnalysesPerDay: Infinity,
    canDeleteDream: true,
    canDeleteEmotion: true,
    canUseCorrelations: true,
    canUseNotifications: true,
    canUseNumerology: true,
    maxNameNumerologiesPerDay: 3
  }
};

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  plan: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  dreamCount: {
    type: Number,
    default: 0
  },
  dreamLimitResetAt: {
    type: Date,
    default: Date.now
  },
  lastPaymentId: {
    type: String,
    default: null
  },
  premiumSince: {
    type: Date,
    default: null
  },
  premiumExpiresAt: {
    type: Date,
    default: null
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['inactive', 'active', 'cancelled', 'expired'],
      default: 'inactive'
    },
    mercadoPagoSubscriptionId: {
      type: String,
      default: null
    },
    mercadoPagoPlanId: {
      type: String,
      default: null
    },
    startedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    lastPaymentAt: {
      type: Date,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  notificationsEnabled: {
    type: Boolean,
    default: false
  },
  fcmToken: {
    type: String,
    default: null
  },
  notificationTimes: {
    type: [String],
    default: ["07:00", "21:00"]
  },
  lastNotificationSent: {
    type: Date,
    default: null
  },
  notificationPrompted: {
    type: Boolean,
    default: false
  },
  interpretationCount: {
    type: Number,
    default: 0
  },
  interpretationLimitResetAt: {
    type: Date,
    default: Date.now
  },
  emotionAnalysisCount: {
    type: Number,
    default: 0
  },
  emotionAnalysisLimitResetAt: {
    type: Date,
    default: Date.now
  },
  nameNumerologyCount: {
    type: Number,
    default: 0
  },
  nameNumerologyLimitResetAt: {
    type: Date,
    default: Date.now
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  }
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.checkExpiry = function() {
  const expiredViaSubscription =
    this.plan === 'premium' &&
    this.subscription?.status === 'active' &&
    this.subscription?.expiresAt &&
    new Date() > this.subscription.expiresAt;

  const expiredViaPremium =
    this.plan === 'premium' &&
    this.premiumExpiresAt &&
    new Date() > this.premiumExpiresAt;

  if (expiredViaSubscription || expiredViaPremium) {
    this.plan = 'free';
    this.subscription.status = 'expired';
    return true;
  }
  return false;
};

UserSchema.methods.checkUserPlan = function() {
  this.checkExpiry();

  const limits = PLAN_LIMITS[this.plan] || PLAN_LIMITS.free;
  const now = new Date();
  const isPremium = this.plan === 'premium';
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  let legacyReset = false;

  if (this.dreamLimitResetAt && this.dreamLimitResetAt > oneDayFromNow) {
    this.dreamCount = 0;
    this.dreamLimitResetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    legacyReset = true;
  }

  let daysRemaining = null;
  if (isPremium && this.premiumExpiresAt) {
    daysRemaining = Math.max(0, Math.ceil((this.premiumExpiresAt - now) / (1000 * 60 * 60 * 24)));
  } else if (isPremium && this.subscription?.expiresAt) {
    daysRemaining = Math.max(0, Math.ceil((this.subscription.expiresAt - now) / (1000 * 60 * 60 * 24)));
  }
  
  const resetPeriod = 24 * 60 * 60 * 1000;

  if (this.dreamLimitResetAt && now > this.dreamLimitResetAt) {
    return {
      plan: this.plan,
      isPremium,
      daysRemaining,
      premiumSince: this.premiumSince || this.subscription?.startedAt || null,
      premiumExpiresAt: this.premiumExpiresAt || this.subscription?.expiresAt || null,
      canInterpret: true,
      canGenerateImage: limits.canGenerateImage,
      canUseSleepMode: limits.canUseSleepMode,
      canSeeWeeklySummary: limits.canSeeWeeklySummary,
      canDeleteDream: limits.canDeleteDream,
      canDeleteEmotion: limits.canDeleteEmotion,
      canUseCorrelations: limits.canUseCorrelations,
      canUseNotifications: limits.canUseNotifications,
      canUseNumerology: limits.canUseNumerology,
      remainingDreams: limits.maxDreams,
      maxDreams: limits.maxDreams,
      remainingInterpretations: limits.maxInterpretationsPerDay,
      maxInterpretationsPerDay: limits.maxInterpretationsPerDay,
      remainingEmotionAnalyses: limits.maxEmotionAnalysesPerDay,
      maxEmotionAnalysesPerDay: limits.maxEmotionAnalysesPerDay,
      remainingNameNumerologies: limits.maxNameNumerologiesPerDay,
      maxNameNumerologiesPerDay: limits.maxNameNumerologiesPerDay,
      isReset: true
    };
  }
  
  const remainingDreams = Math.max(0, limits.maxDreams - (this.dreamCount || 0));

  let remainingInterpretations = limits.maxInterpretationsPerDay;
  if (this.interpretationLimitResetAt && now < this.interpretationLimitResetAt) {
    remainingInterpretations = Math.max(0, limits.maxInterpretationsPerDay - (this.interpretationCount || 0));
  }

  let remainingEmotionAnalyses = limits.maxEmotionAnalysesPerDay;
  if (this.emotionAnalysisLimitResetAt && now < this.emotionAnalysisLimitResetAt) {
    remainingEmotionAnalyses = Math.max(0, limits.maxEmotionAnalysesPerDay - (this.emotionAnalysisCount || 0));
  }

  const nameNumerologyMax = limits.maxNameNumerologiesPerDay;
  let remainingNameNumerologies = nameNumerologyMax;
  if (this.nameNumerologyLimitResetAt && now < this.nameNumerologyLimitResetAt) {
    remainingNameNumerologies = Math.max(0, nameNumerologyMax - (this.nameNumerologyCount || 0));
  }

  return {
    plan: this.plan,
    isPremium,
    daysRemaining,
    premiumSince: this.premiumSince || this.subscription?.startedAt || null,
    premiumExpiresAt: this.premiumExpiresAt || this.subscription?.expiresAt || null,
    canInterpret: remainingDreams > 0,
    canGenerateImage: limits.canGenerateImage,
    canUseSleepMode: limits.canUseSleepMode,
    canSeeWeeklySummary: limits.canSeeWeeklySummary,
    canDeleteDream: limits.canDeleteDream,
    canDeleteEmotion: limits.canDeleteEmotion,
    canUseCorrelations: limits.canUseCorrelations,
    canUseNotifications: limits.canUseNotifications,
    canUseNumerology: limits.canUseNumerology,
    remainingDreams,
    maxDreams: limits.maxDreams,
    remainingInterpretations,
    maxInterpretationsPerDay: limits.maxInterpretationsPerDay,
    remainingEmotionAnalyses,
    maxEmotionAnalysesPerDay: limits.maxEmotionAnalysesPerDay,
    remainingNameNumerologies,
    maxNameNumerologiesPerDay: nameNumerologyMax,
    isReset: legacyReset
  };
};

UserSchema.methods.canAccessFeature = function(feature) {
  const planInfo = this.checkUserPlan();
  const featureMap = {
    'generate_image': planInfo.canGenerateImage,
    'interpret_dream': planInfo.canInterpret,
    'sleep_mode': planInfo.canUseSleepMode,
    'weekly_summary': planInfo.canSeeWeeklySummary,
    'delete_dream': planInfo.canDeleteDream,
    'delete_emotion': planInfo.canDeleteEmotion,
    'correlations': planInfo.canUseCorrelations,
    'notifications': planInfo.canUseNotifications,
    'numerology': planInfo.canUseNumerology,
    'astral_chart': planInfo.canGenerateImage,
    'emotion_insights': planInfo.isPremium,
    'chat_emotional': planInfo.isPremium,
    'dream_coach': planInfo.isPremium,
    'timeline': planInfo.isPremium,
    'life_insights': planInfo.isPremium
  };
  
  return featureMap[feature] || false;
};

UserSchema.methods.incrementDreamCount = async function() {
  const max = this.plan === 'premium' ? PLAN_LIMITS.premium.maxDreams : PLAN_LIMITS.free.maxDreams;

  if ((this.dreamCount || 0) >= max) {
    return false;
  }

  await this.constructor.findByIdAndUpdate(this._id, { $inc: { dreamCount: 1 } });
  this.dreamCount = (this.dreamCount || 0) + 1;
  return true;
};

UserSchema.methods.incrementInterpretationCount = async function() {
  const now = new Date();
  const resetPeriod = 24 * 60 * 60 * 1000;

  if (this.interpretationLimitResetAt && now > this.interpretationLimitResetAt) {
    this.interpretationCount = 0;
    this.interpretationLimitResetAt = new Date(now.getTime() + resetPeriod);
  }

  const max = this.plan === 'premium' ? Infinity : PLAN_LIMITS.free.maxInterpretationsPerDay;

  if ((this.interpretationCount || 0) >= max) {
    return false;
  }

  await this.constructor.findByIdAndUpdate(this._id, { $inc: { interpretationCount: 1 } });
  this.interpretationCount = (this.interpretationCount || 0) + 1;
  return true;
};

UserSchema.methods.incrementEmotionAnalysisCount = async function() {
  const now = new Date();
  const resetPeriod = 24 * 60 * 60 * 1000;

  if (this.emotionAnalysisLimitResetAt && now > this.emotionAnalysisLimitResetAt) {
    this.emotionAnalysisCount = 0;
    this.emotionAnalysisLimitResetAt = new Date(now.getTime() + resetPeriod);
  }

  const max = this.plan === 'premium' ? Infinity : PLAN_LIMITS.free.maxEmotionAnalysesPerDay;

  if ((this.emotionAnalysisCount || 0) >= max) {
    return false;
  }

  await this.constructor.findByIdAndUpdate(this._id, { $inc: { emotionAnalysisCount: 1 } });
  this.emotionAnalysisCount = (this.emotionAnalysisCount || 0) + 1;
  return true;
};

UserSchema.methods.incrementNameNumerologyCount = async function() {
  const now = new Date();
  const resetPeriod = 24 * 60 * 60 * 1000;

  if (this.nameNumerologyLimitResetAt && now > this.nameNumerologyLimitResetAt) {
    this.nameNumerologyCount = 0;
    this.nameNumerologyLimitResetAt = new Date(now.getTime() + resetPeriod);
  }

  const planLimits = PLAN_LIMITS[this.plan] || PLAN_LIMITS.free;
  const max = planLimits.maxNameNumerologiesPerDay;

  if ((this.nameNumerologyCount || 0) >= max) {
    return false;
  }

  await this.constructor.findByIdAndUpdate(this._id, { $inc: { nameNumerologyCount: 1 } });
  this.nameNumerologyCount = (this.nameNumerologyCount || 0) + 1;
  return true;
};

UserSchema.methods.activatePremium = function(paymentId) {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);

  this.plan = 'premium';
  this.lastPaymentId = paymentId;
  this.premiumSince = now;
  this.premiumExpiresAt = expiresAt;
  this.subscription.plan = 'premium';
  this.subscription.status = 'active';
  this.subscription.startedAt = now;
  this.subscription.expiresAt = expiresAt;
  this.subscription.lastPaymentAt = now;
};

UserSchema.statics.getPlanLimits = (plan) => {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
};

UserSchema.statics.expireOverdue = async function() {
  const now = new Date();
  const result1 = await this.updateMany(
    {
      plan: 'premium',
      'subscription.status': 'active',
      'subscription.expiresAt': { $lte: now },
    },
    {
      $set: { plan: 'free', 'subscription.status': 'expired' },
      $unset: { premiumExpiresAt: '' },
    }
  );

  const result2 = await this.updateMany(
    {
      plan: 'premium',
      premiumExpiresAt: { $lte: now },
    },
    {
      $set: { plan: 'free', 'subscription.status': 'expired' },
      $unset: { premiumExpiresAt: '' },
    }
  );

  return result1.modifiedCount + result2.modifiedCount;
};

module.exports = mongoose.model('User', UserSchema);