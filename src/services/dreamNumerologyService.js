const {
  EMOTION_NUMBERS,
  SIGN_NUMBERS,
  FREQUENCY_MAP,
  CHAKRA_MAP,
  PLANET_MAP,
  SPIRITUAL_MESSAGES,
  DreamVibration
} = require('../domain/entities/dreamNumerology');

const BRAZILIAN_TEAMS = Object.freeze([
  "Flamengo", "Corinthians", "Palmeiras", "São Paulo", "Santos",
  "Vasco da Gama", "Fluminense", "Botafogo", "Cruzeiro", "Atlético-MG",
  "Grêmio", "Internacional", "Bahia", "Sport", "Vitória",
  "Coritiba", "Athletico-PR", "Fortaleza", "Ceará",
  "Avaí", "Chapecoense", "Ponte Preta", "Juventude",
  "Londrina", "Operário-PR", "CRB"
]);

function reduceToSingleDigit(number) {
  if (number <= 9) return number;
  const digitSum = String(number).split('').reduce((sum, digit) => sum + parseInt(digit, 10), 0);
  return reduceToSingleDigit(digitSum);
}

function detectEmotions(texto) {
  if (!texto) return [];
  const minusculas = texto.toLowerCase();
  const detected = [];

  const emotionKeywords = {
    medo: ['medo', 'terror', 'pânico', 'assustado', 'receio', 'apavorado', 'angústia', 'angustia', 'atemorizado'],
    ansiedade: ['ansiedade', 'ansioso', 'nervoso', 'preocupado', 'inquieto', 'angustiado', 'aflito'],
    alegria: ['alegria', 'alegre', 'feliz', 'risos', 'rir', 'contente', 'eufórico', 'satisfeito', 'radiante'],
    amor: ['amor', 'amável', 'carinho', 'afeto', 'apaixonado', 'ternura', 'cuidado'],
    transformacao: ['transformação', 'transformacao', 'mudança', 'mudanca', 'renascimento', 'evolução', 'evolucao', 'crescimento'],
    coragem: ['coragem', 'força', 'forca', 'determinação', 'determinacao', 'ousadia', 'bravura'],
    bloqueio: ['bloqueio', 'impedido', 'preso', 'parado', 'travado', 'obstáculo', 'obstaculo', 'barreira'],
    espiritualidade: ['espiritualidade', 'espiritual', 'oração', 'oracao', 'fé', 'fe', 'divino', 'sagrado', 'meditação', 'meditacao'],
    intuicao: ['intuição', 'intuicao', 'pressentimento', 'sexto sentido', 'percepção', 'percepcao'],
    energia: ['energia', 'vibração', 'vibracao', 'vitalidade', 'ânimo', 'animo', 'disposição', 'disposicao'],
    liberdade: ['liberdade', 'livre', 'soltar', 'libertação', 'libertacao', 'independência', 'independencia'],
    protecao: ['proteção', 'protecao', 'protegido', 'segurança', 'seguranca', 'abrigo', 'escudo', 'guardião', 'guardiao'],
    misterio: ['mistério', 'misterio', 'enigmas', 'enigma', 'oculto', 'desconhecido', 'sobrenatural'],
    sucesso: ['sucesso', 'vitória', 'vitoria', 'conquista', 'realização', 'realizacao', 'triunfo', 'prosperidade'],
    tristeza: ['tristeza', 'triste', 'choro', 'lagrimas', 'lágrimas', 'sofrimento', 'melancolia', 'saudade', 'dor'],
    luz: ['luz', 'iluminado', 'claridade', 'brilho', 'radiante', 'luminosidade'],
    alma: ['alma', 'espírito', 'espirito', 'essência', 'essencia', 'profundo', 'interior'],
    mudanca: ['mudança', 'mudanca', 'transição', 'transicao', 'novo ciclo', 'recomeço', 'recomeco'],
    tremor: ['tremor', 'tremer', 'tremendo', 'vibrando', 'abalado', 'abalou']
  };

  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    for (const keyword of keywords) {
      if (minusculas.includes(keyword)) {
        if (!detected.includes(emotion)) {
          detected.push(emotion);
        }
        break;
      }
    }
  }

  return detected;
}

function calculateVibration(emotions) {
  if (!emotions || emotions.length === 0) return 1;

  const sum = emotions.reduce((total, emotion) => {
    return total + (EMOTION_NUMBERS[emotion] || 0);
  }, 0);

  if (sum === 0) return 1;

  return reduceToSingleDigit(sum);
}

function calculateFinalEnergy(sunSign, moonSign, ascendant, dreamVibration) {
  const sunNum = SIGN_NUMBERS[sunSign] || 1;
  const moonNum = SIGN_NUMBERS[moonSign] || 1;
  const ascNum = SIGN_NUMBERS[ascendant] || 1;

  const total = sunNum + moonNum + ascNum + dreamVibration;

  return reduceToSingleDigit(total);
}

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateUniqueNumbers(quantity, min, max, seed) {
  const random = seededRandom(seed);
  const numbers = new Set();

  let attempts = 0;
  while (numbers.size < quantity && attempts < 1000) {
    const num = Math.floor(random() * (max - min + 1)) + min;
    numbers.add(num);
    attempts++;
  }

  return Array.from(numbers).sort((a, b) => a - b);
}

function generateLuckyNumbers(energiaFinal) {
  const seed = energiaFinal * 10000 + new Date().getDate() * 100 + new Date().getMonth();

  const megaSena = generateUniqueNumbers(6, 1, 60, seed);
  const quina = generateUniqueNumbers(5, 1, 80, seed + 1);
  const lotofacil = generateUniqueNumbers(15, 1, 25, seed + 2);
  const duplaSena = generateUniqueNumbers(6, 1, 50, seed + 3);
  const timemania = generateUniqueNumbers(10, 1, 80, seed + 4);

  const teamIndex = Math.floor(seededRandom(seed + 5)() * BRAZILIAN_TEAMS.length);
  const timeDoCoracao = BRAZILIAN_TEAMS[teamIndex] || 'Flamengo';

  return {
    megaSena,
    quina,
    lotofacil,
    duplaSena,
    timemania: {
      numbers: timemania,
      team: timeDoCoracao
    }
  };
}

function getFrequency(energy) {
  return FREQUENCY_MAP[energy] || '432Hz';
}

function getChakra(energy) {
  return CHAKRA_MAP[energy] || 'Coronário';
}

function getPlanet(energy) {
  return PLANET_MAP[energy] || 'Netuno';
}

function getSpiritualMessage(energy, detectedEmotions) {
  const baseMessage = SPIRITUAL_MESSAGES[energy] || SPIRITUAL_MESSAGES[1];

  if (detectedEmotions && detectedEmotions.length > 0) {
    const emotionsText = detectedEmotions
      .map(e => e.charAt(0).toUpperCase() + e.slice(1))
      .join(', ');
    return `${baseMessage} Suas emoções principais (${emotionsText}) indicam o caminho para o autoconhecimento.`;
  }

  return baseMessage;
}

function calculateDreamNumerology({ interpretacao, sunSign, moonSign, ascendant }) {
  if (!interpretacao) {
    return createFallbackNumerology();
  }

  try {
    const detectedEmotions = detectEmotions(interpretacao);
    const dreamVibration = calculateVibration(detectedEmotions);
    const energiaFinal = calculateFinalEnergy(sunSign, moonSign, ascendant, dreamVibration);
    const luckyNumbers = generateLuckyNumbers(energiaFinal);
    const frequency = getFrequency(energiaFinal);
    const chakra = getChakra(energiaFinal);
    const planet = getPlanet(energiaFinal);
    const spiritualMessage = getSpiritualMessage(energiaFinal, detectedEmotions);

    return new DreamVibration({
      vibration: dreamVibration,
      energy: energiaFinal,
      frequency,
      chakra,
      planet,
      detectedEmotions,
      luckyNumbers,
      spiritualMessage
    });
  } catch (error) {
    console.error('Erro ao calcular numerologia do sonho:', error);
    return createFallbackNumerology();
  }
}

function createFallbackNumerology() {
  return new DreamVibration({
    vibration: 1,
    energy: 1,
    frequency: '396Hz',
    chakra: 'Raiz',
    planet: 'Sol',
    detectedEmotions: [],
    luckyNumbers: {
      megaSena: [1, 2, 3, 4, 5, 6],
      quina: [1, 2, 3, 4, 5],
      lotofacil: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      duplaSena: [1, 2, 3, 4, 5, 6],
      timemania: { numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], team: 'Flamengo' }
    },
    spiritualMessage: 'Confie no seu processo. Cada sonho traz uma mensagem importante para seu crescimento.'
  });
}

module.exports = {
  detectEmotions,
  calculateVibration,
  calculateFinalEnergy,
  generateLuckyNumbers,
  getFrequency,
  getChakra,
  getPlanet,
  getSpiritualMessage,
  calculateDreamNumerology,
  createFallbackNumerology,
  EMOTION_NUMBERS,
  SIGN_NUMBERS
};
