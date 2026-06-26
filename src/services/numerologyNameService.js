const LETTER_MAP = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8
};

const VOWELS = new Set(['A','E','I','O','U']);

const INTERPRETATIONS = {
  1: { essence: 'Início, liderança, independência', traits: ['criatividade','coragem','originalidade','ambição'], text: 'Você possui uma alma pioneira, com talento natural para liderar e iniciar novos projetos. Sua independência é sua maior força.' },
  2: { essence: 'Sensibilidade, cooperação, equilíbrio', traits: ['diplomacia','intuição','parceria','paciência'], text: 'Sua alma busca harmonia e conexão. Você é um pacificador nato, com habilidade para unir pessoas e criar ambientes equilibrados.' },
  3: { essence: 'Comunicação, criatividade, expressão', traits: ['otimismo','talento artístico','sociabilidade','alegria'], text: 'Você expressa sua alma através da criatividade e da comunicação. É uma pessoa carismática que inspira alegria por onde passa.' },
  4: { essence: 'Estabilidade, trabalho, disciplina', traits: ['praticidade','confiabilidade','organização','determinação'], text: 'Sua alma é construída sobre bases sólidas. Você é prático, confiável e constrói seus sonhos com trabalho disciplinado.' },
  5: { essence: 'Liberdade, aventura, mudança', traits: ['versatilidade','curiosidade','adaptabilidade','progresso'], text: 'Sua alma anseia por liberdade e novas experiências. Você é versátil e se adapta rapidamente às mudanças da vida.' },
  6: { essence: 'Responsabilidade, família, amor', traits: ['cuidado','justiça','devotamento','harmonia'], text: 'Sua alma é dedicada ao bem-estar dos outros. Você encontra realização no cuidado com a família e na busca pela justiça.' },
  7: { essence: 'Sabedoria, introspecção, espiritualidade', traits: ['análise','profundidade','inteligência','mistério'], text: 'Sua alma busca o conhecimento mais profundo. Você é um pensador nato, com uma conexão especial com o mundo espiritual.' },
  8: { essence: 'Poder, abundância, realização', traits: ['ambição','liderança','autoridade','materialismo'], text: 'Sua alma é voltada para grandes realizações. Você tem potencial para alcançar poder e abundância através de sua determinação.' },
  9: { essence: 'Humanitarismo, compaixão, transformação', traits: ['generosidade','sabedoria','idealismo','tolerância'], text: 'Sua alma é movida pela compaixão universal. Você veio para transformar o mundo através do amor e da compreensão.' },
  11: { essence: 'Intuição elevada, inspiração divina', traits: ['visão espiritual','sensibilidade','iluminação','criatividade'], text: 'Número mestre da intuição. Sua alma possui uma conexão espiritual elevada e uma sensibilidade fora do comum.' },
  22: { essence: 'Construtor mestre, realização prática', traits: ['pragmatismo','visão','grandeza','liderança'], text: 'Número mestre da realização. Você tem o poder de transformar sonhos em realidade com visão prática e determinação.' },
  33: { essence: 'Mestre da cura, amor incondicional', traits: ['sacrifício','ensinamento','compaixão','cura'], text: 'Número mestre da compaixão. Sua alma é dedicada à cura e ao ensinamento, com amor incondicional pela humanidade.' }
};

const ANGEL_NUMBERS = {
  '1111': 'Despertar espiritual — seus pensamentos estão se manifestando rapidamente. Mantenha o foco no positivo.',
  '2222': 'Equilíbrio e harmonia — confie no processo da vida. Tudo está se alinhando para o seu bem maior.',
  '3333': 'Criatividade e expansão — os mestres ascensos estão ao seu lado. Expresse sua verdade interior.',
  '4444': 'Proteção e estabilidade — os anjos estão próximos. Seu trabalho árduo está sendo apoiado.',
  '5555': 'Transformação radical — grandes mudanças estão chegando. Abrace-as com coragem.',
  '6666': 'Reequilíbrio — foque no espiritual e não apenas no material. Busque harmonia interior.',
  '7777': 'Sorte e milagres — o universo está conspirando a seu favor. Confie na jornada espiritual.',
  '8888': 'Abundância infinita — prosperidade material e espiritual estão chegando. Você colhe o que plantou.',
  '9999': 'Completude e propósito — um ciclo se encerra. Você está pronto para o próximo nível.'
};

const PYRAMID_MEANINGS = {
  1: 'Fase de iniciativa e liderança',
  2: 'Fase de cooperação e parcerias',
  3: 'Fase de criatividade e expressão',
  4: 'Fase de construção e estabilidade',
  5: 'Fase de mudanças e liberdade',
  6: 'Fase de responsabilidade familiar',
  7: 'Fase de introspecção e sabedoria',
  8: 'Fase de poder e realização',
  9: 'Fase de transformação e compaixão',
  11: 'Fase de inspiração espiritual',
  22: 'Fase de realização prática'
};

function reduceToDigit(n, isMaster = false) {
  if (n === 0) return 0;
  let num = n;
  while (num > 9 && !(isMaster && (num === 11 || num === 22 || num === 33))) {
    num = String(num).split('').reduce((s, d) => s + parseInt(d), 0);
  }
  return num;
}

function letterValue(char) {
  return LETTER_MAP[char.toUpperCase()] || 0;
}

function isVowel(char) {
  return VOWELS.has(char.toUpperCase());
}

function extractLetters(name) {
  return name.replace(/[^A-Za-zÀ-ÿ]/g, '').split('');
}

function getLetterValues(name) {
  const letters = extractLetters(name);
  return letters.map(l => ({
    letter: l.toUpperCase(),
    value: letterValue(l),
    highlighted: true
  }));
}

function calculateVowels(name) {
  const letters = extractLetters(name);
  const vowelLetters = letters.filter(l => isVowel(l));
  const sum = vowelLetters.reduce((s, l) => s + letterValue(l), 0);
  const reduced = reduceToDigit(sum);
  return {
    letters: vowelLetters.map(l => l.toUpperCase()),
    sum,
    reduced,
    soulNumber: reduced
  };
}

function calculateConsonants(name) {
  const letters = extractLetters(name);
  const consonantLetters = letters.filter(l => !isVowel(l));
  const sum = consonantLetters.reduce((s, l) => s + letterValue(l), 0);
  const reduced = reduceToDigit(sum);
  return {
    letters: consonantLetters.map(l => l.toUpperCase()),
    sum,
    reduced,
    personalityNumber: reduced
  };
}

function calculateExpression(name) {
  const letters = extractLetters(name);
  const values = letters.map(l => letterValue(l));
  const sum = values.reduce((s, v) => s + v, 0);
  const reduced = reduceToDigit(sum);
  const steps = [];
  const groups = [];
  const nameParts = name.split(/[\s,]+/).filter(Boolean);
  nameParts.forEach(part => {
    const partLetters = extractLetters(part);
    const partSum = partLetters.reduce((s, l) => s + letterValue(l), 0);
    groups.push(`${part.toUpperCase()}=${partSum}`);
  });
  steps.push(`Nomes: ${groups.join(', ')}`);
  steps.push(`Soma total: ${sum}`);
  steps.push(`Redução: ${reduced}`);
  return { sum, reduced, number: reduced, steps };
}

function calculateLifePath(birthDate) {
  const [year, month, day] = birthDate.split('-').map(Number);
  const steps = [];
  const daySum = reduceToDigit(day);
  const monthSum = reduceToDigit(month);
  const yearDigits = String(year).split('').map(Number);
  const yearSum = yearDigits.reduce((s, d) => s + d, 0);
  const yearReduced = reduceToDigit(yearSum);

  steps.push({ label: `Dia (${day})`, value: day, reduced: daySum });
  steps.push({ label: `Mês (${month})`, value: month, reduced: monthSum });
  steps.push({ label: `Ano (${year})`, value: year, reduced: yearReduced });

  const total = daySum + monthSum + yearReduced;
  const lifePathNumber = reduceToDigit(total);
  steps.push({ label: `Soma (${daySum}+${monthSum}+${yearReduced})`, value: total, reduced: lifePathNumber });

  return { steps, number: lifePathNumber };
}

function calculatePyramid(lifePathNumber, birthDate) {
  const [year] = birthDate.split('-').map(Number);
  const stages = [];
  const baseNumber = lifePathNumber;

  const ages = [0, 28, 56, 84];
  for (let i = 0; i < ages.length; i++) {
    const num = reduceToDigit(baseNumber + i);
    stages.push({
      age: ages[i],
      number: num,
      meaning: PYRAMID_MEANINGS[num] || 'Fase de aprendizado e crescimento'
    });
  }

  return stages;
}

function calculateCabalistic(name) {
  const letters = extractLetters(name);
  const sum = letters.reduce((s, l) => s + letterValue(l), 0);
  const result = reduceToDigit(sum);
  return {
    table: { method: 'Pitagórica (A=1, B=2, ..., I=9, J=1, ... Z=8)' },
    calculation: letters.map(l => `${l.toUpperCase()}=${letterValue(l)}`).join(', '),
    result
  };
}

function getCorrelation(numbers) {
  const charMap = {
    1: ['Liderança', 'Inovação', 'Independência', 'Determinação'],
    2: ['Diplomacia', 'Sensibilidade', 'Cooperação', 'Equilíbrio'],
    3: ['Criatividade', 'Expressão', 'Otimismo', 'Sociabilidade'],
    4: ['Estabilidade', 'Disciplina', 'Praticidade', 'Confiabilidade'],
    5: ['Liberdade', 'Versatilidade', 'Adaptabilidade', 'Progresso'],
    6: ['Responsabilidade', 'Amor', 'Família', 'Harmonia'],
    7: ['Sabedoria', 'Introspecção', 'Espiritualidade', 'Análise'],
    8: ['Poder', 'Abundância', 'Realização', 'Autoridade'],
    9: ['Compaixão', 'Humanitarismo', 'Transformação', 'Generosidade'],
    11: ['Intuição', 'Inspiração', 'Iluminação', 'Sensibilidade'],
    22: ['Realização', 'Construção', 'Visão', 'Pragmatismo'],
    33: ['Cura', 'Amor Incondicional', 'Ensinamento', 'Sacrifício']
  };
  const chars = [];
  [...new Set(numbers)].forEach(n => {
    if (charMap[n]) chars.push(...charMap[n]);
  });
  return [...new Set(chars)];
}

function getAngelNumbers(numbers) {
  const result = [];
  [1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999].forEach(n => {
    if (numbers.includes(reduceToDigit(n))) {
      result.push({ number: String(n), meaning: ANGEL_NUMBERS[String(n)] });
    }
  });
  if (result.length === 0) {
    const defaults = [1111, 2222, 3333, 4444].map(n => ({
      number: String(n),
      meaning: ANGEL_NUMBERS[String(n)]
    }));
    result.push(...defaults);
  }
  return result;
}

function getInterpretation(n) {
  return INTERPRETATIONS[n] || INTERPRETATIONS[reduceToDigit(n)] || {
    essence: 'Número de potencial ilimitado',
    traits: ['singularidade', 'potencial', 'descoberta'],
    text: 'Este número representa um potencial único e inexplorado em sua jornada.'
  };
}

function generateSummary(numerology) {
  const parts = [];
  const { soulNumber, personalityNumber } = numerology.vowels;
  const { number: expNumber } = numerology.expression;
  const { number: lifePathNumber } = numerology.lifePath;

  parts.push(`Com base no nome "${numerology.fullName}" e na data de nascimento fornecida, sua análise numerológica revela um perfil multifacetado e profundo.`);

  const soul = getInterpretation(soulNumber);
  const person = getInterpretation(personalityNumber);
  const expr = getInterpretation(expNumber);
  const life = getInterpretation(lifePathNumber);

  parts.push(`Sua Alma (${soulNumber}) revela ${soul.essence.toLowerCase()}, enquanto sua Personalidade (${personalityNumber}) expressa ${person.essence.toLowerCase()}.`);

  parts.push(`O Número da Expressão (${expNumber}) indica ${expr.essence.toLowerCase()}, e o Caminho da Vida (${lifePathNumber}) aponta para ${life.essence.toLowerCase()}.`);

  const allNumbers = [soulNumber, personalityNumber, expNumber, lifePathNumber];
  const chars = getCorrelation(allNumbers);
  if (chars.length > 0) {
    const topChars = chars.slice(0, 5);
    parts.push(`Suas principais características incluem: ${topChars.join(', ')}.`);
  }

  parts.push('Esta combinação numérica única forma o mapa da sua jornada. A numerologia do nome revela não apenas quem você é, mas também o potencial que você pode alcançar ao longo da vida.');
  parts.push('Lembre-se: os números são guias, não destino. Use este conhecimento como ferramenta de autoconhecimento e crescimento pessoal.');

  return parts.join(' ');
}

function generateAll(fullName, birthDate) {
  const letterValues = getLetterValues(fullName);
  const vowels = calculateVowels(fullName);
  const consonants = calculateConsonants(fullName);
  const expression = calculateExpression(fullName);
  const lifePath = calculateLifePath(birthDate);
  const pyramid = calculatePyramid(lifePath.number, birthDate);
  const cabalistic = calculateCabalistic(fullName);
  const allNums = [vowels.soulNumber, consonants.personalityNumber, expression.number, lifePath.number, cabalistic.result];
  const correlation = {
    numbers: [...new Set(allNums)],
    characteristics: getCorrelation(allNums)
  };
  const angelNumbers = getAngelNumbers(allNums);

  const numerology = {
    fullName,
    letterValues,
    vowels,
    consonants,
    expression,
    lifePath,
    pyramidOfLife: pyramid,
    cabalistic,
    correlation,
    angelNumbers
  };

  numerology.interpretations = {
    soul: { number: vowels.soulNumber, ...getInterpretation(vowels.soulNumber) },
    personality: { number: consonants.personalityNumber, ...getInterpretation(consonants.personalityNumber) },
    expression: { number: expression.number, ...getInterpretation(expression.number) },
    lifePath: { number: lifePath.number, ...getInterpretation(lifePath.number) }
  };

  numerology.overallSummary = generateSummary(numerology);

  return numerology;
}

module.exports = { generateAll, getInterpretation };
