const mongoose = require('mongoose');

const CompanionJourneySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['ansiedade', 'sono', 'rotina', 'produtividade', 'espiritualidade', 'autoestima', 'hábitos', 'relacionamentos'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active',
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  importance: {
    type: Number,
    min: 1,
    max: 10,
    default: 5,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastInteraction: {
    type: Date,
    default: Date.now,
  },
  currentStage: {
    type: String,
    default: '',
  },
  summary: {
    type: String,
    default: '',
  },
  nextSuggestion: {
    type: String,
    default: '',
  },
  evidence: [{
    source: String,
    detail: String,
    date: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

CompanionJourneySchema.index({ userId: 1, status: 1, importance: -1, progress: -1, updatedAt: -1 });
CompanionJourneySchema.index({ userId: 1, category: 1, status: 1 });

module.exports = mongoose.model('CompanionJourney', CompanionJourneySchema);
