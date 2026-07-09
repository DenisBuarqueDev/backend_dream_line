const memoryExtraction = require('./memoryExtractionService');

const CATEGORIES = {
  HEALTH: 'Saúde',
  FAMILY: 'Família',
  WORK: 'Trabalho',
  SPIRITUALITY: 'Espiritualidade',
  HABITS: 'Hábitos',
  SLEEP: 'Sono',
  EMOTIONS: 'Emoções',
  GOALS: 'Objetivos',
  PREFERENCES: 'Preferências',
  FEARS: 'Medos',
};

const IMPORTANCE = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

function detectUpdates(text) {
  const updates = [];
  const patterns = [
    { pattern: /n[ãa]o (tenho|sinto|faço) mais (.+)/i, type: 'negation', factIdx: 2 },
    { pattern: /parei de (.+)/i, type: 'negation', factIdx: 1 },
    { pattern: /agora (faço|tenho|sou|estou) (.+)/i, type: 'update', factIdx: 2 },
    { pattern: /comecei (a|com) (.+)/i, type: 'update', factIdx: 2 },
    { pattern: /voltei a (.+)/i, type: 'update', factIdx: 1 },
    { pattern: /n[ãa]o (durmo|como|bebo|fumo) mais (.+)/i, type: 'negation', factIdx: 2 },
    { pattern: /troquei (.+)/i, type: 'update', factIdx: 1 },
  ];
  for (const { pattern, type, factIdx } of patterns) {
    const match = text.match(pattern);
    if (match) {
      updates.push({ type, fact: match[factIdx].trim() });
    }
  }
  return updates;
}

function detectDurableFacts(text) {
  const facts = [];
  const patterns = [

    { pattern: /(?:tenho|fui diagnosticad[oa] com) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.HEALTH, importance: IMPORTANCE.HIGH },
    { pattern: /meu (?:médico|psicólogo|terapeuta|psiquiatra) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.HEALTH, importance: IMPORTANCE.HIGH },
    { pattern: /(?:faço|comecei|pratico) (?:terapia|acompanhamento|tratamento)(.+?)(?:[.,!?]|$)/i, category: CATEGORIES.HEALTH, importance: IMPORTANCE.MEDIUM },

    { pattern: /(?:tenho|sinto) medo de (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.FEARS, importance: IMPORTANCE.HIGH },
    { pattern: /(?:me|meu) (?:assusta|preocupa|incomoda) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.FEARS, importance: IMPORTANCE.MEDIUM },

    { pattern: /(?:trabalho com|sou|minha profiss[ãa]o é|meu emprego é) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.WORK, importance: IMPORTANCE.HIGH },
    { pattern: /(?:quero|pretendo|meu objetivo é|gostaria de) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.GOALS, importance: IMPORTANCE.MEDIUM },
    { pattern: /(?:estou tentando|tentando) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.GOALS, importance: IMPORTANCE.MEDIUM },

    { pattern: /(?:acordo|durmo) (?:[àa]s|por volta das) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.SLEEP, importance: IMPORTANCE.MEDIUM },
    { pattern: /(?:tenho|sofro de) (?:ins[oô]nia|apneia|sonambulismo|paralisia do sono)(.+?)(?:[.,!?]|$)/i, category: CATEGORIES.SLEEP, importance: IMPORTANCE.HIGH },
    { pattern: /n[ãa]o (?:estou|tenho) dormindo bem/i, category: CATEGORIES.SLEEP, importance: IMPORTANCE.MEDIUM },

    { pattern: /(?:gosto de|adoro|amo|curto) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.PREFERENCES, importance: IMPORTANCE.LOW },
    { pattern: /(?:n[ãa]o gosto|odeio|detesto) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.PREFERENCES, importance: IMPORTANCE.LOW },
    { pattern: /(?:prefiro|gosto mais de) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.PREFERENCES, importance: IMPORTANCE.LOW },

    { pattern: /(?:faço|pratico) (?:exerc[ií]cio|academia|yoga|meditação|pilates|natação|corrida|caminhada)(.+?)(?:[.,!?]|$)/i, category: CATEGORIES.HABITS, importance: IMPORTANCE.MEDIUM },
    { pattern: /(?:tomo|bebo) (?:café|rem[eé]dio|vitamina|suplemento|chá)(.+?)(?:[.,!?]|$)/i, category: CATEGORIES.HABITS, importance: IMPORTANCE.MEDIUM },
    { pattern: /(?:como|alimento|dieta|jejum|vegetariano|vegano)(.+?)(?:[.,!?]|$)/i, category: CATEGORIES.HABITS, importance: IMPORTANCE.MEDIUM },

    { pattern: /(?:minha fam[ií]lia|meus pais|meu filho|minha filha|meu irm[ãa]o|minha irm[ãa]|minha m[ãe]e|meu pai|meu marido|minha esposa|meu namorado|minha namorada) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.FAMILY, importance: IMPORTANCE.MEDIUM },
    { pattern: /(?:casado|casada|noivo|noiva|divorciado|divorciada|solteir[oa])(.+?)(?:[.,!?]|$)/i, category: CATEGORIES.FAMILY, importance: IMPORTANCE.MEDIUM },

    { pattern: /(?:acredito em|minha f[ée]|minha espiritualidade|rezo|oro|medito) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.SPIRITUALITY, importance: IMPORTANCE.MEDIUM },

    { pattern: /(?:estou|tô|me sinto) (?:ansios[oa]|deprimid[oa]|estressad[oa]|preocupad[oa]) (.+?)(?:[.,!?]|$)/i, category: CATEGORIES.EMOTIONS, importance: IMPORTANCE.LOW },
  ];
  for (const { pattern, category, importance } of patterns) {
    const match = text.match(pattern);
    if (match) {
      const fullMatch = match[0].replace(/[.,!?]+$/, '').trim();
      facts.push({ fact: fullMatch, category, importance });
    }
  }
  return facts;
}

function classifyImportance(fact, category, plan) {
  if (category === CATEGORIES.HEALTH) return IMPORTANCE.HIGH;
  if (category === CATEGORIES.FEARS) return IMPORTANCE.HIGH;

  if (plan && plan.responseType === 'personal_question') return IMPORTANCE.HIGH;
  if (plan && plan.responseType === 'emotional_support' && category === CATEGORIES.EMOTIONS) return IMPORTANCE.LOW;

  return IMPORTANCE.MEDIUM;
}

function shouldPersist(importance) {
  return importance === IMPORTANCE.MEDIUM || importance === IMPORTANCE.HIGH || importance === IMPORTANCE.CRITICAL;
}

function extractUserFacts(question, answer, plan) {
  const combined = `${question} ${answer}`;
  const updates = detectUpdates(question);
  const facts = detectDurableFacts(combined);

  const allFacts = facts.map(f => ({
    ...f,
    importance: classifyImportance(f.fact, f.category, plan),
  }));

  return { updates, facts: allFacts.filter(f => shouldPersist(f.importance)) };
}

async function process(userId, conversationId, question, answer, plan, context) {
  try {
    const { updates, facts } = extractUserFacts(question, answer, plan);

    if (updates.length > 0) {
      for (const update of updates) {
        if (update.type === 'negation') {
          const existing = await memoryExtraction.getFacts(userId, 100);
          if (existing && existing.facts) {
            const related = existing.facts.filter(f =>
              f.fact && f.fact.toLowerCase().includes(update.fact.toLowerCase())
            );
            for (const fact of related) {
              const MemoryFact = require('../models/MemoryFact');
              await MemoryFact.findByIdAndUpdate(fact._id, { isActive: false }).catch(() => {});
            }
          }
        }
      }
    }

    for (const fact of facts) {
      await memoryExtraction.saveFact(userId, conversationId, fact.category, fact.fact, 60);
    }

    const totalLearned = updates.length + facts.length;
    if (totalLearned > 0) {
      console.log(`[Reflection] userId=${userId} learned=${totalLearned} updates=${updates.length} facts=${facts.length}`);
    }
  } catch (err) {
    console.error(`[Reflection] Error for userId=${userId}: ${err.message}`);
  }
}

module.exports = { process };
