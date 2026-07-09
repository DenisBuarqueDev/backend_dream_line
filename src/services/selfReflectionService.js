const ROBOTIC_PATTERNS = [
  /com base (?:nos|nas|nos) (?:dados|informa[cç][ãa]o|registros|hist[oó]rico)/i,
  /de acordo com (?:os dados|as informa[cç][õo]es|o sistema|meus registros)/i,
  /segundo (?:seu hist[oó]rico|suas informa[cç][õo]es|os dados|o banco)/i,
  /conforme (?:registrado|mencionado anteriormente|os dados|o sistema)/i,
  /analisando (?:seus dados|suas informa[cç][õo]es)/i,
  /de acordo com (?:nossos|meus) (?:registros|dados)/i,
  /em (?:nossos|meus) (?:registros|dados|sistema)/i,
  /baseado (?:em seus dados|nas informa[cç][õo]es fornecidas)/i,
  /conforme (?:registrado|consta) em (?:nosso|meu) (?:banco de dados|sistema)/i,
];

const FORMULAIC_OPENINGS = [
  /^(?:sim|n[ãa]o)[,.!;:] (?:com certeza|claro|entendo|percebo)/i,
  /^(?:com certeza|claro|sem d[úu]vida)[,.!;:]/i,
  /^(?:isso [eé] uma|essa [eé] uma) (?:excelente|[oó]tima|boa) pergunta/i,
  /^(?:primeiramente|antes de tudo|antes de mais nada)[,.!;:]/i,
  /^(?:deixe-me|deixa eu) (?:explicar|dizer|falar|responder)/i,
];

function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasRepetition(text) {
  if (!text || typeof text !== 'string') return false;
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (words.length < 10) return false;

  const freq = {};
  let repeats = 0;
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
    if (freq[w] === 3) repeats++;
    if (repeats >= 3) return true;
  }

  for (let n = 3; n <= 6; n++) {
    const seqFreq = {};
    for (let i = 0; i <= words.length - n; i++) {
      const seq = words.slice(i, i + n).join(' ');
      seqFreq[seq] = (seqFreq[seq] || 0) + 1;
      if (seqFreq[seq] >= 3) return true;
    }
  }

  return false;
}

function hasRoboticLanguage(text) {
  if (!text || typeof text !== 'string') return false;
  for (const p of ROBOTIC_PATTERNS) {
    if (p.test(text)) return true;
  }
  for (const p of FORMULAIC_OPENINGS) {
    if (p.test(text)) return true;
  }
  return false;
}

function checkAnswerCompleted(question, answer) {
  if (!answer || answer.length < 10) return false;
  if (answer.startsWith('Desculpe, não foi possível')) return false;

  const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !/[?]/.test(w));
  if (qWords.length === 0) return true;

  const aLower = answer.toLowerCase();
  let matchedKeywords = 0;
  for (const w of qWords) {
    const singular = w.replace(/[aeã]o$/i, 'ão').replace(/[ae]s$/i, '');
    if (aLower.includes(singular)) matchedKeywords++;
  }

  const threshold = Math.max(1, Math.floor(qWords.length * 0.2));
  return matchedKeywords >= threshold;
}

function checkCanDeepen(question, answer, plan) {
  if (!answer || answer.length < 20) return true;
  const wordCount = countWords(answer);

  if (wordCount < 30) return true;

  const qLower = question.toLowerCase();
  const aLower = answer.toLowerCase();

  const questionHasDepth = /como|por que|qual (?:sua|sua opini[ãa]o)|o que (?:voc[êe] acha|pensa)|me (?:ajuda|d[áa]|fale|conte)/i.test(qLower);
  const answerHasFollowUp = /(?:voc[êe] (?:j[áa]|tem|j[áa] tentou|j[áa] pensou|gostaria|sente|acha))|(?:o que (?:voc[êe] acha|pensa))|(?:como (?:tem sido|est[áa]|andando))/i.test(aLower);

  if (questionHasDepth && !answerHasFollowUp) return true;

  return false;
}

function checkTooVerbose(question, answer) {
  const qWords = countWords(question);
  const aWords = countWords(answer);
  if (aWords <= 60) return false;
  if (qWords <= 5 && aWords > 80) return true;
  if (aWords > 150) return true;
  return false;
}

function checkTooShort(question, answer) {
  const aWords = countWords(answer);
  if (aWords < 10) return true;
  const qWords = countWords(question);
  if (qWords > 10 && aWords < 15) return true;
  return false;
}

function checkEmotionalAlignment(answer, emotionalState) {
  if (!emotionalState || !answer) return true;

  const aLower = answer.toLowerCase();
  const mode = emotionalState.conversationMode || '';
  const emotion = (emotionalState.detectedEmotion || '').toLowerCase();

  if (emotionalState.shouldAvoidAnalysis) {
    if (/\ban[áa]lise\b|analisando|analisar|diagn[oó]stico/i.test(aLower)) return false;
  }

  if (emotionalState.shouldBeObjective) {
    if (/sinto muito|compreendo|entendo como (?:voc[êe] se sente|deve ser)/i.test(aLower)) return false;
  }

  if (mode === 'support' && !emotionalState.shouldBeObjective) {
    if (!/(?:sinto|compreendo|entendo|imagino|deve (?:ser|estar))/i.test(aLower)) return false;
  }

  if (mode === 'celebration') {
    if (!/(?:parab[eé]ns|que bom|fico feliz|que legal|maravilha|excelente|incr[ií]vel)/i.test(aLower)) return false;
  }

  if (mode === 'coaching') {
    if (!/(?:voc[êe] pode|que tal|j[áa] pensou|poderia|sugiro|recomendo)/i.test(aLower)) return false;
  }

  return true;
}

function checkInitiativeQuality(initiative, answer) {
  if (!initiative || !initiative.shouldSuggest || !initiative.suggestion) return 'good';

  const sugLower = initiative.suggestion.toLowerCase();
  const sugWords = sugLower.split(/\s+/).filter(w => w.length > 3);

  if (sugWords.length === 0) return 'good';

  const aLower = answer.toLowerCase();
  let matchedWords = 0;
  for (const w of sugWords) {
    if (aLower.includes(w)) matchedWords++;
  }

  const matchRatio = matchedWords / sugWords.length;
  if (matchRatio >= 0.3) return 'good';

  return 'missing';
}

function evaluate(question, answer, plan, emotionalState, initiative) {
  const result = {
    answerCompleted: checkAnswerCompleted(question, answer),
    canDeepenConversation: checkCanDeepen(question, answer, plan),
    tooVerbose: checkTooVerbose(question, answer),
    tooShort: checkTooShort(question, answer),
    emotionalAlignment: checkEmotionalAlignment(answer, emotionalState),
    repetitionDetected: hasRepetition(answer),
    roboticLanguage: hasRoboticLanguage(answer),
    initiativeQuality: checkInitiativeQuality(initiative, answer),
  };

  console.log('[SELF_REFLECTION]', JSON.stringify(result));

  return result;
}

module.exports = { evaluate };
