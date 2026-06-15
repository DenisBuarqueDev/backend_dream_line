const mongoose = require('mongoose');

const EmotionConversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emotionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmotionJournal',
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

EmotionConversationSchema.index({ userId: 1, emotionId: 1 });
EmotionConversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('EmotionConversation', EmotionConversationSchema);
