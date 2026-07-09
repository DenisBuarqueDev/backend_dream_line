const mongoose = require('mongoose');

const ConversationMemorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active',
  },
  importance: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  firstMention: {
    type: Date,
    default: Date.now,
  },
  lastMention: {
    type: Date,
    default: Date.now,
  },
  mentionCount: {
    type: Number,
    default: 1,
  },
  sourceConversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null,
  },
}, {
  timestamps: true,
});

ConversationMemorySchema.index({ userId: 1, status: 1, importance: -1, lastMention: -1 });
ConversationMemorySchema.index({ userId: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('ConversationMemory', ConversationMemorySchema);
