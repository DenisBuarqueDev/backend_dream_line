const {
  LifePathNumber,
  PersonalNumber,
  UniversalDayNumber,
  DailyNumerologyReport,
  MASTER_NUMBERS,
  NUMEROLOGY_INTERPRETATIONS,
  DAY_NUMBER_MESSAGES
} = require('../domain/entities');

function reduceToSingleDigit(number, respectMasterNumbers = true) {
  if (number <= 9) return number;

  const digitSum = String(number).split('').reduce((sum, digit) => sum + parseInt(digit, 10), 0);

  if (respectMasterNumbers && MASTER_NUMBERS.includes(digitSum)) {
    return digitSum;
  }

  return reduceToSingleDigit(digitSum, respectMasterNumbers);
}

function calculateLifePathNumber(birthDate) {
  if (!birthDate) {
    throw new Error('Data de nascimento é obrigatória');
  }

  const cleanDate = birthDate.replace(/-/g, '');
  const digitsOnly = cleanDate.replace(/\D/g, '');

  if (digitsOnly.length !== 8) {
    throw new Error('Data de nascimento inválida. Use formato YYYY-MM-DD');
  }

  const sum = digitsOnly.split('').reduce((total, digit) => total + parseInt(digit, 10), 0);
  const number = reduceToSingleDigit(sum, true);

  return new LifePathNumber(number);
}

function calculatePersonalNumber(birthDate, currentDate) {
  if (!birthDate || !currentDate) {
    throw new Error('Data de nascimento e data atual são obrigatórias');
  }

  const birth = new Date(birthDate);
  const current = new Date(currentDate);

  if (isNaN(birth.getTime()) || isNaN(current.getTime())) {
    throw new Error('Data inválida');
  }

  const day = birth.getDate();
  const month = birth.getMonth() + 1;
  const year = current.getFullYear();

  const sum = day + month + year;
  const number = reduceToSingleDigit(sum, true);

  return new PersonalNumber(number, currentDate);
}

function calculateUniversalDayNumber(currentDate) {
  if (!currentDate) {
    throw new Error('Data atual é obrigatória');
  }

  const date = new Date(currentDate);
  if (isNaN(date.getTime())) {
    throw new Error('Data inválida');
  }

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const sum = day + month + year;
  const number = reduceToSingleDigit(sum, false);

  return new UniversalDayNumber(number, currentDate.split('T')[0]);
}

function generateDailyNumerology(birthDate, currentDate) {
  if (!birthDate) {
    throw new Error('Data de nascimento é obrigatória para numerologia');
  }

  const lifePath = calculateLifePathNumber(birthDate);
  const personalNumber = calculatePersonalNumber(birthDate, currentDate);
  const universalNumber = calculateUniversalDayNumber(currentDate);

  return new DailyNumerologyReport({
    lifePathNumber: lifePath.number,
    personalNumber: personalNumber.number,
    universalNumber: universalNumber.number,
    date: currentDate.split('T')[0]
  });
}

function calculateYearNumber(birthDate, targetYear) {
  if (!birthDate || !targetYear) {
    throw new Error('Data de nascimento e ano alvo são obrigatórios');
  }

  const birth = new Date(birthDate);
  const yearDigits = String(targetYear).split('').map(d => parseInt(d, 10));
  const sum = birth.getDate() + (birth.getMonth() + 1) + yearDigits.reduce((a, b) => a + b, 0);
  const number = reduceToSingleDigit(sum, true);

  return {
    year: targetYear,
    number,
    interpretation: NUMEROLOGY_INTERPRETATIONS[number]
  };
}

function calculateMonthNumber(birthDate, targetYear, targetMonth) {
  if (!birthDate || !targetYear || !targetMonth) {
    throw new Error('Data de nascimento, ano e mês são obrigatórios');
  }

  const birth = new Date(birthDate);
  const yearDigits = String(targetYear).split('').map(d => parseInt(d, 10));
  const sum = birth.getDate() + (birth.getMonth() + 1) + yearDigits.reduce((a, b) => a + b, 0) + targetMonth;
  const number = reduceToSingleDigit(sum, true);

  return {
    year: targetYear,
    month: targetMonth,
    number,
    interpretation: NUMEROLOGY_INTERPRETATIONS[number]
  };
}

function getCompatibilityNumber(number1, number2) {
  if (!number1 || !number2) {
    throw new Error('Dois números são necessários para calcular compatibilidade');
  }

  const sum = number1 + number2;
  const combinedNumber = reduceToSingleDigit(sum, true);

  return {
    number1,
    number2,
    combined: combinedNumber,
    interpretation: NUMEROLOGY_INTERPRETATIONS[combinedNumber]
  };
}

function getAllInterpretations() {
  return NUMEROLOGY_INTERPRETATIONS;
}

function getDayNumberMessage(dayNumber) {
  return DAY_NUMBER_MESSAGES[dayNumber] || "Dia de reflexão e planejamento.";
}

module.exports = {
  calculateLifePathNumber,
  calculatePersonalNumber,
  calculateUniversalDayNumber,
  generateDailyNumerology,
  calculateYearNumber,
  calculateMonthNumber,
  getCompatibilityNumber,
  getAllInterpretations,
  getDayNumberMessage,
  MASTER_NUMBERS,
  NUMEROLOGY_INTERPRETATIONS,
  DAY_NUMBER_MESSAGES
};