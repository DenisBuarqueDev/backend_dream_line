const mongoose = require('mongoose');

const DreamNumerologySchema = new mongoose.Schema({
  vibration: { type: Number },
  energy: { type: Number },
  frequency: { type: String },
  chakra: { type: String },
  planet: { type: String },
  luckyNumbers: {
    megaSena: [Number],
    quina: [Number],
    lotofacil: [Number],
    duplaSena: [Number],
    timemania: {
      numbers: [Number],
      team: String
    }
  },
  detectedEmotions: [String],
  spiritualMessage: String
}, { _id: false });

const DreamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  textoSonho: {
    type: String,
    required: true
  },
  interpretacao: {
    type: String
  },
  categorias: [{
    type: String
  }],
  padroes: {
    tematicos: [String],
    espirituais: [String],
    biologicos: [String]
  },
  sono: {
    horaDormir: String,
    horaAcordar: String,
    duracaoHoras: Number
  },
  dreamCategory: {
    type: String,
    enum: ['Perseguição', 'Queda', 'Água', 'Família', 'Trabalho', 'Morte', 'Dinheiro', 'Viagem', 'Relacionamento', 'Outros'],
    default: 'Outros'
  },
  imageUrl: {
    type: String
  },
  imagePublicId: {
    type: String
  },
  imageGeneratedAt: {
    type: Date
  },
  dreamNumerology: DreamNumerologySchema,
  aiData: {
    transcription: String,
    interpretation: String,
    emotions: [String],
    numerology: {
      vibration: Number,
      energy: Number,
      frequency: String,
      chakra: String,
      planet: String,
      luckyNumbers: {
        megaSena: [Number],
        quina: [Number],
        lotofacil: [Number],
        duplaSena: [Number],
        timemania: {
          numbers: [Number],
          team: String
        }
      }
    },
    imageUrl: String,
    imagePrompt: String,
    imageSeed: Number,
    frequencies: [String],
    chakra: String,
    spiritualMessage: String,
    symbols: [{
      symbol: String,
      meaning: String
    }],
    psychologicalAnalysis: String,
    provider: String,
    generatedAt: Date
  }
}, {
  timestamps: true
});

DreamSchema.index({ userId: 1, createdAt: -1 });
DreamSchema.index({ userId: 1, 'sono.duracaoHoras': 1 });

module.exports = mongoose.model('Dream', DreamSchema);