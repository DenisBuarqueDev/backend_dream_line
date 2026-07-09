const mongoose = require('mongoose');

const RELATIONSHIP_TYPES = [
  'Cônjuge', 'Filho', 'Pai', 'Mãe', 'Irmão', 'Irmã',
  'Família', 'Amigo', 'Colega', 'Chefe', 'Psicólogo',
  'Médico', 'Outro',
];

const RelationshipMemorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  relationship: {
    type: String,
    enum: RELATIONSHIP_TYPES,
    default: 'Outro',
  },
  importance: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
  },
  emotionalWeight: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
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
  currentStatus: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

RelationshipMemorySchema.index({ userId: 1, name: 1 }, { unique: true });
RelationshipMemorySchema.index({ userId: 1, importance: -1, emotionalWeight: -1, lastMention: -1 });

module.exports = mongoose.model('RelationshipMemory', RelationshipMemorySchema);
