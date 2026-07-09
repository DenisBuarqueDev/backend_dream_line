const mongoose = require('mongoose');

const MemoryFactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    enum: ['Saúde', 'Família', 'Trabalho', 'Espiritualidade', 'Hábitos', 'Sono', 'Emoções', 'Objetivos', 'Preferências', 'Medos'],
    required: true,
  },
  fact: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
  },
  firstSeen: {
    type: Date,
    default: Date.now,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  occurrences: {
    type: Number,
    default: 1,
  },
  importanceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lifecycleStatus: {
    type: String,
    enum: ['active', 'inactive', 'archived', 'protected'],
    default: 'active',
  },
  sourceConversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null,
  },
}, {
  timestamps: true,
});

MemoryFactSchema.index({ userId: 1, category: 1 });
MemoryFactSchema.index({ userId: 1, isActive: 1, importanceScore: -1 });
MemoryFactSchema.index({ userId: 1, fact: 1 }, { unique: true });

module.exports = mongoose.model('MemoryFact', MemoryFactSchema);
