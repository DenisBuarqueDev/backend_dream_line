const mongoose = require('mongoose');

const PlanetPositionSchema = new mongoose.Schema({
  planet: { type: String, required: true },
  sign: { type: String, required: true },
  degree: { type: Number, required: true },
  fullDegree: { type: Number, required: true },
  house: { type: Number },
  retrograde: { type: Boolean, default: false }
}, { _id: false });

const AspectSchema = new mongoose.Schema({
  planet1: { type: String, required: true },
  planet2: { type: String, required: true },
  aspect: { type: String, required: true },
  angle: { type: Number, required: true },
  orb: { type: Number, required: true }
}, { _id: false });

const HouseSchema = new mongoose.Schema({
  house: { type: Number, required: true },
  sign: { type: String, required: true },
  degree: { type: Number, required: true }
}, { _id: false });

const InterpretationSchema = new mongoose.Schema({
  sun: { type: String },
  moon: { type: String },
  ascendant: { type: String },
  mercury: { type: String },
  venus: { type: String },
  mars: { type: String },
  jupiter: { type: String },
  saturn: { type: String }
}, { _id: false });

const AstralChartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    default: 'Mapa Astral'
  },
  birthData: {
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: {
      city: { type: String, required: true },
      country: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      timezone: { type: String, required: true }
    }
  },
  sunSign: { type: String, required: true },
  moonSign: { type: String, required: true },
  ascendant: { type: String, required: true },
  planets: [PlanetPositionSchema],
  houses: [HouseSchema],
  aspects: [AspectSchema],
  interpretation: InterpretationSchema,
  chartType: {
    type: String,
    enum: ['natal', 'transit', 'synastry'],
    default: 'natal'
  }
}, {
  timestamps: true
});

AstralChartSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AstralChart', AstralChartSchema);