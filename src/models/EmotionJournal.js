const mongoose = require('mongoose');

const EmotionJournalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalText: {
    type: String,
    required: true
  },
  emotion: {
    type: String,
    required: true
  },
  intensity: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },
  causes: [String],
  advice: [String],
  aiSummary: String,
}, {
  timestamps: true
});

EmotionJournalSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('EmotionJournal', EmotionJournalSchema);
