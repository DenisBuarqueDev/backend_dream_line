const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PLAN_LIMITS = {
  free: {
    maxDreams: 5,
    maxAstralCharts: 1,
    canGenerateImage: false,
    canUseSleepMode: false,
    canSeeWeeklySummary: false,
    canGetFullInterpretation: false
  },
  premium: {
    maxDreams: 60,
    maxAstralCharts: Infinity,
    canGenerateImage: true,
    canUseSleepMode: true,
    canSeeWeeklySummary: true,
    canGetFullInterpretation: true
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
  }
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.checkUserPlan = function() {
  const limits = PLAN_LIMITS[this.plan] || PLAN_LIMITS.free;
  const now = new Date();
  
  if (this.dreamLimitResetAt && now > this.dreamLimitResetAt) {
    return {
      plan: this.plan,
      canInterpret: true,
      canGenerateImage: limits.canGenerateImage,
      canUseSleepMode: limits.canUseSleepMode,
      canSeeWeeklySummary: limits.canSeeWeeklySummary,
      remainingDreams: limits.maxDreams,
      maxDreams: limits.maxDreams,
      isReset: true
    };
  }
  
  const remaining = Math.max(0, limits.maxDreams - (this.dreamCount || 0));
  
  return {
    plan: this.plan,
    canInterpret: remaining > 0,
    canGenerateImage: limits.canGenerateImage,
    canUseSleepMode: limits.canUseSleepMode,
    canSeeWeeklySummary: limits.canSeeWeeklySummary,
    remainingDreams: remaining,
    maxDreams: limits.maxDreams,
    isReset: false
  };
};

UserSchema.methods.canAccessFeature = function(feature) {
  const planInfo = this.checkUserPlan();
  const featureMap = {
    'generate_image': planInfo.canGenerateImage,
    'interpret_dream': planInfo.canInterpret,
    'sleep_mode': planInfo.canUseSleepMode,
    'weekly_summary': planInfo.canSeeWeeklySummary
  };
  
  return featureMap[feature] || false;
};

UserSchema.methods.incrementDreamCount = async function() {
  const planInfo = this.checkUserPlan();
  
  if (!planInfo.canInterpret) {
    return false;
  }
  
  this.dreamCount = (this.dreamCount || 0) + 1;
  await this.save();
  return true;
};

UserSchema.statics.getPlanLimits = (plan) => {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
};

module.exports = mongoose.model('User', UserSchema);