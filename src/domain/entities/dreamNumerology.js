const EMOTION_NUMBERS = Object.freeze({
  medo: 7,
  ansiedade: 5,
  alegria: 3,
  amor: 6,
  transformacao: 9,
  transformação: 9,
  coragem: 1,
  bloqueio: 4,
  espiritualidade: 11,
  intuicao: 2,
  intuição: 2,
  energia: 8,
  liberdade: 5,
  mudanca: 5,
  mudança: 5,
  protecao: 6,
  proteção: 6,
  misterio: 7,
  mistério: 7,
  sucesso: 8,
  tristeza: 9,
  luz: 1,
  alma: 7,
  calor: 6,
  frio: 4,
  tremor: 5
});

const SIGN_NUMBERS = Object.freeze({
  'Áries': 1,
  'Touro': 2,
  'Gêmeos': 3,
  'Câncer': 4,
  'Leão': 5,
  'Virgem': 6,
  'Libra': 7,
  'Escorpião': 8,
  'Sagitário': 9,
  'Capricórnio': 1,
  'Aquário': 2,
  'Peixes': 3
});

const FREQUENCY_MAP = Object.freeze({
  1: '396Hz',
  2: '417Hz',
  3: '432Hz',
  4: '528Hz',
  5: '639Hz',
  6: '741Hz',
  7: '852Hz',
  8: '963Hz',
  9: '1111Hz'
});

const CHAKRA_MAP = Object.freeze({
  1: 'Raiz',
  2: 'Sacral',
  3: 'Plexo Solar',
  4: 'Cardíaco',
  5: 'Laríngeo',
  6: 'Frontal',
  7: 'Coronário',
  8: 'Aura Superior',
  9: 'Consciência Cósmica'
});

const PLANET_MAP = Object.freeze({
  1: 'Sol',
  2: 'Lua',
  3: 'Mercúrio',
  4: 'Vênus',
  5: 'Marte',
  6: 'Júpiter',
  7: 'Saturno',
  8: 'Urano',
  9: 'Netuno'
});

const SPIRITUAL_MESSAGES = Object.freeze({
  1: 'Momento de agir com coragem. Seu sonho revela que você tem a força necessária para iniciar algo novo. Confie no seu poder interior.',
  2: 'Busque equilíbrio emocional. Seu sonho mostra a importância da parceria e da intuição. Confie nos seus sentimentos.',
  3: 'Expresse sua criatividade. O sonho indica que a alegria e a comunicação serão suas melhores ferramentas hoje.',
  4: 'Hora de construir bases sólidas. Seu sonho fala de estabilidade e disciplina. Organize seus pensamentos e ações.',
  5: 'Mudanças estão a caminho. O sonho sinaliza liberdade e transformação. Abrace o novo com confiança.',
  6: 'Amor e harmonia em foco. Seu sonho destaca a importância dos relacionamentos e do cuidado com quem você ama.',
  7: 'Mergulhe na sua espiritualidade. O sonho convida à introspecção e à busca por sabedoria interior.',
  8: 'Poder e abundância. Seu sonho indica que você está alinhado com energias de prosperidade e realização.',
  9: 'Ciclo de transformação. O sonho marca o fim de um ciclo e o nascimento de algo maior. Libere o passado.'
});

class DreamVibration {
  constructor({ vibration, energy, frequency, chakra, planet, detectedEmotions, luckyNumbers, spiritualMessage }) {
    this.vibration = vibration;
    this.energy = energy;
    this.frequency = frequency;
    this.chakra = chakra;
    this.planet = planet;
    this.detectedEmotions = detectedEmotions;
    this.luckyNumbers = luckyNumbers;
    this.spiritualMessage = spiritualMessage;
  }

  toJSON() {
    return {
      vibration: this.vibration,
      energy: this.energy,
      frequency: this.frequency,
      chakra: this.chakra,
      planet: this.planet,
      detectedEmotions: this.detectedEmotions,
      luckyNumbers: this.luckyNumbers,
      spiritualMessage: this.spiritualMessage
    };
  }
}

module.exports = {
  EMOTION_NUMBERS,
  SIGN_NUMBERS,
  FREQUENCY_MAP,
  CHAKRA_MAP,
  PLANET_MAP,
  SPIRITUAL_MESSAGES,
  DreamVibration
};
