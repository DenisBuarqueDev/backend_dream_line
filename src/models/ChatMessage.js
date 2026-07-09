const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId(),
  },
  conversationTitle: {
    type: String,
    default: null,
  },
  messageIndex: {
    type: Number,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    default: null,
  },
  temperature: {
    type: Number,
    default: null,
  },
  contextVersion: {
    type: String,
    default: 'v1',
  },
  latency: {
    type: Number,
    default: null,
  },
  promptTokens: {
    type: Number,
    default: null,
  },
  completionTokens: {
    type: Number,
    default: null,
  },
  summary: {
    type: String,
    default: null,
  },
  summaryVersion: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

ChatMessageSchema.index({ userId: 1, createdAt: -1 });
ChatMessageSchema.index({ userId: 1, conversationId: 1, messageIndex: 1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
