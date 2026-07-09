const mongoose = require('mongoose');

const DailyCompanionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['encouragement', 'sleep', 'dreams', 'emotions', 'habits', 'goals', 'achievements', 'relationships', 'reflection', 'motivation'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  source: {
    type: String,
    enum: ['proactive_insight', 'companion_journey', 'goal_tracking', 'memory_fact', 'relationship', 'dream_coach', 'life_insight', 'timeline', 'adaptive_profile', 'system'],
    required: true,
  },
  reason: {
    type: String,
    default: '',
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  delivered: {
    type: Boolean,
    default: false,
  },
  viewed: {
    type: Boolean,
    default: false,
  },
  dismissed: {
    type: Boolean,
    default: false,
  },
  viewedAt: {
    type: Date,
    default: null,
  },
  dismissedAt: {
    type: Date,
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

DailyCompanionSchema.index({ userId: 1, date: 1 }, { unique: true });
DailyCompanionSchema.index({ userId: 1, date: 1, priority: -1 });

module.exports = mongoose.model('DailyCompanion', DailyCompanionSchema);
