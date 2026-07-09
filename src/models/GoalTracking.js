const mongoose = require('mongoose');

const GoalTrackingSchema = new mongoose.Schema({
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
    enum: ['Sono', 'Emoções', 'Ansiedade', 'Estresse', 'Trabalho', 'Estudos', 'Família', 'Hábitos', 'Espiritualidade', 'Sonhos', 'Saúde', 'Geral'],
    default: 'Geral',
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active',
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  importance: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  completedAt: {
    type: Date,
    default: null,
  },
  sourceConversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null,
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

GoalTrackingSchema.index({ userId: 1, status: 1, progress: -1 });
GoalTrackingSchema.index({ userId: 1, title: 1 }, { unique: true });

module.exports = mongoose.model('GoalTracking', GoalTrackingSchema);
