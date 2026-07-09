const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  coverDreamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dream',
    default: null,
  },
  dreams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dream',
  }],
}, {
  timestamps: true,
});

CollectionSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Collection', CollectionSchema);
