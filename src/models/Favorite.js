const mongoose = require('mongoose');

const FavoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  dreamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dream',
    required: true,
  },
}, {
  timestamps: true,
});

FavoriteSchema.index({ userId: 1, dreamId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', FavoriteSchema);
