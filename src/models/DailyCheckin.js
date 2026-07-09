const mongoose = require('mongoose');

const DailyCheckinSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  mood: {
    type: String,
    enum: ['muito_bem', 'bem', 'normal', 'triste', 'muito_mal'],
    required: true,
  },
  sleepQuality: {
    type: String,
    enum: ['excelente', 'bom', 'regular', 'ruim'],
    required: true,
  },
  wantRecordDream: {
    type: String,
    enum: ['sim', 'depois'],
    default: 'depois',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

DailyCheckinSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyCheckin', DailyCheckinSchema);
