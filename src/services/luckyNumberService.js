const BRAZILIAN_TEAMS = Object.freeze([
  "Flamengo", "Corinthians", "Palmeiras", "São Paulo", "Santos",
  "Vasco da Gama", "Fluminense", "Botafogo", "Cruzeiro", "Atlético-MG",
  "Grêmio", "Internacional", "Bahia", "Sport", "Vitória",
  "Coritiba", "Athletico-PR", "São Paulo FC", "Fortaleza", "Ceará",
  "Avaí", "Chapecoense", "Ponte Preta", "Brasiliense", "Juventude",
  "Londrina", "Paraná", "Operário-PR", "CRB", "Botafogo-SP"
]);

const DISCLAIMER = "Números gerados para entretenimento apenas. Não garantem ganhos e têm caráter puramente recreativo.";

function generateUniqueNumbers(quantity, min, max) {
  if (quantity > (max - min + 1)) {
    throw new Error(`Impossible to generate ${quantity} unique numbers in range ${min}-${max}`);
  }

  const numbers = new Set();
  
  while (numbers.size < quantity) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    numbers.add(num);
  }

  return Array.from(numbers).sort((a, b) => a - b);
}

function formatNumbers(numbers) {
  return numbers.map(n => n.toString().padStart(2, "0")).join("-");
}

function enhanceWithPersonalNumber(baseNumbers, personalNumber, quantity, min, max) {
  if (personalNumber < min || personalNumber > max) {
    return baseNumbers;
  }

  const enhanced = [...baseNumbers];
  const variations = [personalNumber];

  for (let i = 1; i <= 3; i++) {
    const add = personalNumber + (i * 9);
    if (add <= max) variations.push(add);
    const sub = personalNumber - (i * 9);
    if (sub >= min) variations.push(sub);
  }

  const shuffled = variations.filter(v => !enhanced.includes(v));
  
  while (enhanced.length < quantity && shuffled.length > 0) {
    const randomIndex = Math.floor(Math.random() * shuffled.length);
    enhanced.push(shuffled.splice(randomIndex, 1)[0]);
  }

  return generateUniqueNumbers(quantity, min, max).map((num, i) => {
    if (i < baseNumbers.length) return baseNumbers[i];
    return num;
  }).slice(0, quantity);
}

function generateMegaSena(personalNumber = null, useEnhancement = false) {
  let numbers = generateUniqueNumbers(6, 1, 60);
  
  if (useEnhancement && personalNumber) {
    numbers = enhanceWithPersonalNumber(numbers.slice(0, 4), personalNumber, 6, 1, 60);
  }

  return {
    numbers,
    formatted: formatNumbers(numbers)
  };
}

function generateLotofacil(personalNumber = null, useEnhancement = false) {
  let numbers = generateUniqueNumbers(15, 1, 25);
  
  if (useEnhancement && personalNumber) {
    numbers = enhanceWithPersonalNumber(numbers.slice(0, 8), personalNumber, 15, 1, 25);
  }

  return {
    numbers,
    formatted: formatNumbers(numbers)
  };
}

function generateQuina(personalNumber = null, useEnhancement = false) {
  let numbers = generateUniqueNumbers(5, 1, 80);
  
  if (useEnhancement && personalNumber) {
    numbers = enhanceWithPersonalNumber(numbers.slice(0, 2), personalNumber, 5, 1, 80);
  }

  return {
    numbers,
    formatted: formatNumbers(numbers)
  };
}

function generateDuplaSena(personalNumber = null, useEnhancement = false) {
  let numbers = generateUniqueNumbers(6, 1, 50);
  
  if (useEnhancement && personalNumber) {
    numbers = enhanceWithPersonalNumber(numbers.slice(0, 3), personalNumber, 6, 1, 50);
  }

  return {
    numbers,
    formatted: formatNumbers(numbers)
  };
}

function generateTimemania(personalNumber = null, useEnhancement = false) {
  let numbers = generateUniqueNumbers(10, 1, 80);
  
  if (useEnhancement && personalNumber) {
    numbers = enhanceWithPersonalNumber(numbers.slice(0, 5), personalNumber, 10, 1, 80);
  }

  const randomTeamIndex = Math.floor(Math.random() * BRAZILIAN_TEAMS.length);
  const timeDoCoracao = BRAZILIAN_TEAMS[randomTeamIndex];

  return {
    numbers,
    formatted: formatNumbers(numbers),
    timeDoCoracao
  };
}

function calculatePersonalNumberFromBirthDate(birthDate) {
  if (!birthDate) return null;

  const date = new Date(birthDate);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const sum = day + month + year;
  let result = sum;
  
  while (result > 9 && ![11, 22, 33].includes(result)) {
    result = result.toString().split("").reduce((acc, d) => acc + parseInt(d, 10), 0);
  }

  return result;
}

function generateAllLuckyGames(userData = {}) {
  const { birthDate, useEnhancement = false } = userData;
  
  const personalNumber = birthDate 
    ? calculatePersonalNumberFromBirthDate(birthDate) 
    : null;

  const megaSena = generateMegaSena(personalNumber, useEnhancement);
  const lotofacil = generateLotofacil(personalNumber, useEnhancement);
  const quina = generateQuina(personalNumber, useEnhancement);
  const duplaSena = generateDuplaSena(personalNumber, useEnhancement);
  const timemania = generateTimemania(personalNumber, useEnhancement);

  return {
    games: {
      megaSena: megaSena.numbers,
      megaSenaFormatted: megaSena.formatted,
      lotofacil: lotofacil.numbers,
      lotofacilFormatted: lotofacil.formatted,
      quina: quina.numbers,
      quinaFormatted: quina.formatted,
      duplaSena: duplaSena.numbers,
      duplaSenaFormatted: duplaSena.formatted,
      timemania: timemania.numbers,
      timemaniaFormatted: timemania.formatted,
      timeDoCoracao: timemania.timeDoCoracao
    },
    personalNumber,
    usedEnhancement: useEnhancement && personalNumber !== null,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER
  };
}

function getGamesInfo() {
  return {
    megaSena: { name: "Mega-Sena", numbers: 6, range: "1-60" },
    lotofacil: { name: "Lotofácil", numbers: 15, range: "1-25" },
    quina: { name: "Quina", numbers: 5, range: "1-80" },
    duplaSena: { name: "Dupla Sena", numbers: 6, range: "1-50" },
    timemania: { name: "Timemania", numbers: 10, range: "1-80 + Time do Coração" }
  };
}

function getTeamsList() {
  return BRAZILIAN_TEAMS;
}

function formatSingleGame(numbers) {
  return formatNumbers(numbers);
}

function generateSingleGame(gameType, personalNumber = null, useEnhancement = false) {
  const games = {
    megaSena: () => generateMegaSena(personalNumber, useEnhancement),
    lotofacil: () => generateLotofacil(personalNumber, useEnhancement),
    quina: () => generateQuina(personalNumber, useEnhancement),
    duplaSena: () => generateDuplaSena(personalNumber, useEnhancement),
    timemania: () => generateTimemania(personalNumber, useEnhancement)
  };

  const generator = games[gameType];
  if (!generator) {
    throw new Error(`Tipo de jogo inválido: ${gameType}`);
  }

  return generator();
}

module.exports = {
  generateUniqueNumbers,
  formatNumbers,
  generateMegaSena,
  generateLotofacil,
  generateQuina,
  generateDuplaSena,
  generateTimemania,
  calculatePersonalNumberFromBirthDate,
  generateAllLuckyGames,
  getGamesInfo,
  getTeamsList,
  formatSingleGame,
  generateSingleGame,
  DISCLAIMER,
  BRAZILIAN_TEAMS
};