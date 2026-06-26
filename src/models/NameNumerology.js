const mongoose = require('mongoose');

const LetterValueSchema = new mongoose.Schema({
  letter: String,
  value: Number,
  highlighted: Boolean
}, { _id: false });

const LifePathStepSchema = new mongoose.Schema({
  label: String,
  value: Number,
  reduced: Number
}, { _id: false });

const InterpretationSchema = new mongoose.Schema({
  number: Number,
  essence: String,
  traits: [String],
  text: String
}, { _id: false });

const AngelNumberSchema = new mongoose.Schema({
  number: String,
  meaning: String
}, { _id: false });

const PyramidStageSchema = new mongoose.Schema({
  age: Number,
  number: Number,
  meaning: String
}, { _id: false });

const NameNumerologySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  birthDate: {
    type: String,
    required: true
  },
  calculations: {
    letterValues: [LetterValueSchema],
    vowels: {
      letters: [String],
      sum: Number,
      reduced: Number,
      soulNumber: Number
    },
    consonants: {
      letters: [String],
      sum: Number,
      reduced: Number,
      personalityNumber: Number
    },
    expression: {
      sum: Number,
      reduced: Number,
      number: Number,
      steps: [String]
    },
    lifePath: {
      steps: [LifePathStepSchema],
      number: Number
    },
    pyramidOfLife: [PyramidStageSchema],
    cabalistic: {
      table: mongoose.Schema.Types.Mixed,
      calculation: String,
      result: Number
    },
    correlation: {
      numbers: [Number],
      characteristics: [String]
    },
    angelNumbers: [AngelNumberSchema],
    interpretations: {
      soul: InterpretationSchema,
      personality: InterpretationSchema,
      expression: InterpretationSchema,
      lifePath: InterpretationSchema
    },
    overallSummary: String
  }
}, { timestamps: true });

NameNumerologySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('NameNumerology', NameNumerologySchema);
