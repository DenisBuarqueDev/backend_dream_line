const mongoose = require('mongoose');

const ConversationQualitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    required: true,
  },
  conversationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  responseQuality: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  engagement: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  followUpGenerated: {
    type: Boolean,
    default: false,
  },
  followUpAnswered: {
    type: Boolean,
    default: false,
  },
  initiativeUsed: {
    type: Boolean,
    default: false,
  },
  initiativeAccepted: {
    type: Boolean,
    default: false,
  },
  emotionalAlignment: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  contextUsage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  memoryUsage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  dreamCoachUsage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  timelineUsage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  lifeInsightsUsage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  goalTrackingUsage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  proactiveInsightsUsage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  responseLength: {
    type: Number,
    default: 0,
  },
  responseDepth: {
    type: String,
    enum: ['superficial', 'média', 'profunda', ''],
    default: '',
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

ConversationQualitySchema.index({ userId: 1, createdAt: -1 });
ConversationQualitySchema.index({ userId: 1, conversationId: 1 });

module.exports = mongoose.model('ConversationQuality', ConversationQualitySchema);
