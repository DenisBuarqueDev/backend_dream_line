const MemoryFact = require('../models/MemoryFact');
const memoryLifecycle = require('./memoryLifecycleService');

const RULES = [
  { pattern: /acordo (sempre |quase sempre |geralmente |normalmente )?(à|as|a) (\d{1,2})[h:]?(\d{0,2})/i, category: 'Sono', getFact: m => `Acorda ${m[2]} ${m[3]}${m[4] ? 'h' + m[4] : 'h'}`, baseConfidence: 80 },
  { pattern: /durmo (sempre |quase sempre |geralmente |normalmente )?(à|as|a) (\d{1,2})[h:]?(\d{0,2})/i, category: 'Sono', getFact: m => `Dorme ${m[2]} ${m[3]}${m[4] ? 'h' + m[4] : 'h'}`, baseConfidence: 80 },
  { pattern: /(acordo|desperto) (sempre|toda noite|no meio da noite|de madrugada) (\d{1,2})/i, category: 'Sono', getFact: m => `Acorda de madrugada (${m[3]}h)`, baseConfidence: 75 },
  { pattern: /(tenho|estou com|sofro de) insônia/i, category: 'Sono', getFact: () => 'Tem insônia', baseConfidence: 85 },
  { pattern: /(tenho|estou com) (dificuldade|problema) (para|pra) dormir/i, category: 'Sono', getFact: () => 'Tem dificuldade para dormir', baseConfidence: 80 },
  { pattern: /(tenho|tive) (pesadelo|pesadelos)/i, category: 'Sono', getFact: () => 'Tem pesadelos frequentes', baseConfidence: 70 },

  { pattern: /(fui|estou sendo) (diagnosticado|diagnosticada) com ([a-zçáéíóúãõâêô\s]+)/i, category: 'Saúde', getFact: m => `Diagnosticado com ${m[3].trim()}`, baseConfidence: 90 },
  { pattern: /(tenho|tive) (ansiedade|depressão|burnout|síndrome do pânico|bipolaridade|transtorno|borderline)/i, category: 'Saúde', getFact: m => `Tem ${m[2]}`, baseConfidence: 85 },
  { pattern: /(faço|fazendo) (terapia|acompanhamento psicológico|psicólogo|psicóloga|psiquiatra)/i, category: 'Saúde', getFact: () => 'Faz terapia', baseConfidence: 80 },
  { pattern: /(estou|tô) (grávida|gestante)/i, category: 'Saúde', getFact: () => 'Está grávida', baseConfidence: 90 },
  { pattern: /(tomo|uso|tomei) ([a-zçáéíóúãõâê\s]+) (para|por causa de|por conta de)/i, category: 'Saúde', getFact: m => `Usa ${m[2].trim()}`, baseConfidence: 75 },

  { pattern: /(tenho|sinto) (muito )?(medo|pavor) de ([a-zçáéíóúãõâêô\s]+)/i, category: 'Medos', getFact: m => `Medo de ${m[4].trim()}`, baseConfidence: 80 },
  { pattern: /me (assusta|apavora|amedronta) ([a-zçáéíóúãõâêô\s]+)/i, category: 'Medos', getFact: m => `Medo de ${m[2].trim()}`, baseConfidence: 75 },

  { pattern: /(sou|estou) (casado|casada|divorciado|divorciada|viúvo|viúva)/i, category: 'Família', getFact: m => `É ${m[2]}`, baseConfidence: 80 },
  { pattern: /(tenho|tive) (um|uma|dois|duas|três) (filho|filha)/i, category: 'Família', getFact: m => `Tem ${m[2]} ${m[3]}(s)`, baseConfidence: 75 },
  { pattern: /perdi (meu|minha) ([a-zçáéíóúãõâêô\s]+) (recentemente|faz|há|tem)/i, category: 'Família', getFact: m => `Perdeu ${m[1]} ${m[2].trim()}`, baseConfidence: 85 },
  { pattern: /(estou passando|estou enfrentando) por (um|uma) (divórcio|separação)/i, category: 'Família', getFact: () => 'Está passando por um divórcio', baseConfidence: 90 },
  { pattern: /(meu|minha) ([a-zçáéíóúãõâêô\s]+) (faleceu|morreu|faleceu recentemente|partiu)/i, category: 'Família', getFact: m => `${m[1]} ${m[2].trim()} faleceu`, baseConfidence: 90 },
  { pattern: /(sou|sou) (mãe|pai) (solteira|solteiro|de [a-zçáéíóúãõâêô\s]+)/i, category: 'Família', getFact: m => `É ${m[2]} ${m[3]}`, baseConfidence: 75 },
  { pattern: /(meu|minha) (filho|filha) (tem|está|é|foi|teve) ([a-zçáéíóúãõâêô\s]+)/i, category: 'Família', getFact: m => `Filho(a) ${m[4].trim()}`, baseConfidence: 65 },

  { pattern: /trabalho (com|em|como|à noite|de noite|durante a noite|em casa|home office|remoto) ([a-zçáéíóúãõâêô\s]*)/i, category: 'Trabalho', getFact: m => `Trabalha ${m[1]} ${m[2] ? m[2].trim() : ''}`, baseConfidence: 75 },
  { pattern: /(estou|fui|me) (desempregado|desempregada|demitido|demitida)/i, category: 'Trabalho', getFact: () => 'Está desempregado', baseConfidence: 85 },
  { pattern: /(mudei|troquei) (de )?(trabalho|emprego)/i, category: 'Trabalho', getFact: () => 'Mudou de trabalho', baseConfidence: 80 },
  { pattern: /(estou|tô) (de licença|afastado|afastada)/i, category: 'Trabalho', getFact: m => `Está ${m[2]}`, baseConfidence: 75 },

  { pattern: /pratico (meditação|yoga|pilates|exercício|esporte|corrida|caminhada|natação|musculação|jiu.jitsu|capoeira|dança)/i, category: 'Hábitos', getFact: m => `Pratica ${m[1]}`, baseConfidence: 75 },
  { pattern: /costumo ([a-zçáéíóúãõâêô\s]+) (sempre|regularmente|todo dia|toda semana|diariamente)/i, category: 'Hábitos', getFact: m => `Costuma ${m[1].trim()}`, baseConfidence: 65 },
  { pattern: /(comecei|passei) a ([a-zçáéíóúãõâêô\s]+)/i, category: 'Hábitos', getFact: m => `Começou a ${m[2].trim()}`, baseConfidence: 70 },

  { pattern: /(estou|tô) me sentindo ([a-zçáéíóúãõâêô,\s]+)/i, category: 'Emoções', getFact: m => `Sente-se ${m[2].trim()}`, baseConfidence: 65 },
  { pattern: /(estou|tô) (muito|bastante|extremamente) (ansioso|ansiosa|estressado|estressada|preocupado|preocupada|triste|feliz|animado|animada)/i, category: 'Emoções', getFact: m => `Sente-se ${m[3]}`, baseConfidence: 70 },
  { pattern: /(sinto|sinto.me) (muita|muito|bastante|imensa) ([a-zçáéíóúãõâêô\s]+)/i, category: 'Emoções', getFact: m => `Sente ${m[2]} ${m[3].trim()}`, baseConfidence: 60 },

  { pattern: /quero (muito )?(melhorar|aprender|conseguir|superar|vencer|lidar com|controlar|entender) ([a-zçáéíóúãõâêô\s]+)/i, category: 'Objetivos', getFact: m => `Quer ${m[2]} ${m[3].trim()}`, baseConfidence: 70 },
  { pattern: /(meu|minha) (maior |grande |principal )?(objetivo|meta|sonho|desejo) (é|seria) ([a-zçáéíóúãõâêô\s]+)/i, category: 'Objetivos', getFact: m => `Objetivo: ${m[5].trim()}`, baseConfidence: 80 },
  { pattern: /gostaria (muito )?de ([a-zçáéíóúãõâêô\s]+)/i, category: 'Objetivos', getFact: m => `Gostaria de ${m[2].trim()}`, baseConfidence: 60 },

  { pattern: /sou (espírita|católico|católica|evangélico|evangélica|umbandista|budista|judeu|religioso|religiosa|espiritualizado|espiritualizada)/i, category: 'Espiritualidade', getFact: m => `É ${m[1]}`, baseConfidence: 80 },
  { pattern: /(faço|pratico) (rezas|orações|preces|meditação espiritual|estudo espiritual)/i, category: 'Espiritualidade', getFact: m => `Pratica ${m[2]}`, baseConfidence: 75 },
];

const FACT_CANONICAL = {
  'Tem dificuldade para dormir': 'Tem insônia',
  'Está passando por um divórcio/separação': 'Está passando por um divórcio',
  'Está desempregado(a)': 'Está desempregado',
  'Mudou de trabalho recentemente': 'Mudou de trabalho',
  'Faz terapia/acompanhamento psicológico': 'Faz terapia',
  'Sente-se ansioso': 'Sente ansiedade',
  'Sente-se ansiosa': 'Sente ansiedade',
  'Sente-se estressado': 'Sente estresse',
  'Sente-se estressada': 'Sente estresse',
};

const NEGATION_RULES = [
  { pattern: /(melhorei|superei) (da |de |a )?(ansiedade|depressão|insônia)/i, getSearchTerm: m => m[3] },
  { pattern: /não (tenho|sinto) mais ([a-zçáéíóúãõâêô\s]+)/i, getSearchTerm: m => m[2].trim() },
  { pattern: /não (sofro|tenho) mais de ([a-zçáéíóúãõâêô\s]+)/i, getSearchTerm: m => m[2].trim() },
  { pattern: /já superei (o |a )?([a-zçáéíóúãõâêô\s]+)/i, getSearchTerm: m => m[2].trim() },
  { pattern: /parei de (ter |tomar |praticar |fazer )?([a-zçáéíóúãõâêô\s]+)/i, getSearchTerm: m => m[2].trim() },
  { pattern: /não pratico mais ([a-zçáéíóúãõâêô\s]+)/i, getSearchTerm: m => m[1].trim() },
  { pattern: /não tomo mais ([a-zçáéíóúãõâêô\s]+)/i, getSearchTerm: m => m[1].trim() },
  { pattern: /deixei de (ter |tomar |praticar |fazer )?([a-zçáéíóúãõâêô\s]+)/i, getSearchTerm: m => m[2].trim() },
  { pattern: /não faço mais ([a-zçáéíóúãõâêô\s]+)/i, getSearchTerm: m => m[1].trim() },
];

function normalizeFact(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function calculateImportanceScore(confidence, occurrences, lastSeen) {
  const now = Date.now();
  const daysSinceLastSeen = Math.max(0, (now - new Date(lastSeen).getTime()) / 86400000);
  const recencyScore = Math.max(0, 100 - daysSinceLastSeen * 1.5);
  const occurrenceScore = Math.min(100, occurrences * 15);
  return Math.round(
    confidence * 0.35 + occurrenceScore * 0.35 + recencyScore * 0.30
  );
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function processNegation(userId, conversationId, question) {
  const searchTerms = [...new Set(
    NEGATION_RULES.flatMap(rule => {
      const match = question.match(rule.pattern);
      if (!match) return [];
      const term = rule.getSearchTerm(match);
      return term ? [term] : [];
    })
  )];

  for (const term of searchTerms) {
    try {
      const regex = new RegExp(escapeRegex(term), 'i');
      const facts = await MemoryFact.find({ userId, isActive: true, fact: { $regex: regex } });
      for (const fact of facts) {
        fact.isActive = false;
        fact.lastSeen = new Date();
        fact.importanceScore = calculateImportanceScore(fact.confidence, fact.occurrences, fact.lastSeen);
        await fact.save();
      }
    } catch (err) {
      console.error('[MemoryExtraction] negation error:', err.message);
    }
  }
}

async function saveFact(userId, conversationId, category, fact, confidence) {
  const canonicalFact = FACT_CANONICAL[fact] || fact;
  const existing = await MemoryFact.findOne({ userId, fact: canonicalFact });

  if (existing) {
    const newOccurrences = existing.occurrences + 1;
    const newConfidence = Math.max(existing.confidence, confidence);
    const importance = calculateImportanceScore(newConfidence, newOccurrences, new Date());
    const update = {
      $set: { lastSeen: new Date(), sourceConversationId: conversationId, importanceScore: importance },
      $inc: { occurrences: 1 },
      $max: { confidence },
    };
    if (existing.lifecycleStatus && existing.lifecycleStatus !== 'active' && existing.lifecycleStatus !== 'protected') {
      update.$set.isActive = true;
      update.$set.lifecycleStatus = 'active';
    }
    await MemoryFact.findByIdAndUpdate(existing._id, update);
    return;
  }

  try {
    const importance = calculateImportanceScore(confidence, 1, new Date());
    await MemoryFact.create({
      userId, category, fact: canonicalFact, confidence,
      firstSeen: new Date(), lastSeen: new Date(),
      occurrences: 1, importanceScore: importance,
      sourceConversationId: conversationId,
    });
  } catch (err) {
    if (err.code === 11000) {
      const created = await MemoryFact.findOne({ userId, fact: canonicalFact });
      if (created) {
        const newConfidence = Math.max(created.confidence, confidence);
        const importance = calculateImportanceScore(newConfidence, created.occurrences + 1, new Date());
        await MemoryFact.findByIdAndUpdate(created._id, {
          $set: { lastSeen: new Date(), importanceScore: importance },
          $inc: { occurrences: 1 },
          $max: { confidence },
        });
      }
    } else {
      console.error('[MemoryExtraction] save error:', err.message);
    }
  }
}

async function extractAndSave(userId, conversationId, question) {
  if (!question || question.length < 10) return [];

  await processNegation(userId, conversationId, question);

  const extracted = [];

  for (const rule of RULES) {
    const match = question.match(rule.pattern);
    if (match) {
      const fact = normalizeFact(rule.getFact(match));
      if (!fact) continue;
      extracted.push({ category: rule.category, fact, confidence: rule.baseConfidence });
    }
  }

  for (const item of extracted) {
    await saveFact(userId, conversationId, item.category, item.fact, item.confidence);
  }

  return extracted;
}

async function buildLongTermSummary(userId, factsInput) {
  try {
    const facts = factsInput || await MemoryFact.find({ userId, isActive: true })
      .sort({ importanceScore: -1 })
      .limit(20)
      .select('category fact')
      .lean();

    if (facts.length === 0) return null;

    const byCategory = {};
    for (const f of facts) {
      if (!byCategory[f.category]) byCategory[f.category] = [];
      byCategory[f.category].push(f.fact);
    }

    const categoryOrder = ['Sono', 'Saúde', 'Emoções', 'Família', 'Trabalho', 'Hábitos', 'Objetivos', 'Medos', 'Espiritualidade'];
    const parts = [];

    for (const cat of categoryOrder) {
      const items = byCategory[cat];
      if (!items || items.length === 0) continue;

      if (cat === 'Sono') {
        parts.push(`sono: ${items.join(', ')}`);
      } else if (cat === 'Saúde') {
        parts.push(`saúde: ${items.join(', ')}`);
      } else if (cat === 'Emoções') {
        parts.push(`emoções: ${items.join(', ')}`);
      } else if (cat === 'Família') {
        parts.push(`família: ${items.join(', ')}`);
      } else if (cat === 'Trabalho') {
        parts.push(`trabalho: ${items.join(', ')}`);
      } else if (cat === 'Hábitos') {
        parts.push(`hábitos: ${items.join(', ')}`);
      } else if (cat === 'Objetivos') {
        parts.push(`objetivos: ${items.join(', ')}`);
      } else if (cat === 'Medos') {
        parts.push(`medos: ${items.join(', ')}`);
      } else {
        parts.push(`${cat.toLowerCase()}: ${items.join(', ')}`);
      }
    }

    if (parts.length === 0) return null;

    return parts.join('. ') + '.';
  } catch (err) {
    console.error('[MemoryExtraction] buildLongTermSummary error:', err.message);
    return null;
  }
}

async function getFacts(userId, limit = 10) {
  try {
    const facts = await MemoryFact.find({ userId, isActive: true })
      .sort({ importanceScore: -1 })
      .limit(30)
      .select('category fact importanceScore')
      .lean();

    const topFacts = facts.slice(0, limit);
    const summaryLongTerm = buildLongTermSummary(null, facts);

    return { facts: topFacts, summaryLongTerm };
  } catch (err) {
    console.error('[MemoryExtraction] getFacts error:', err.message);
    return { facts: [], summaryLongTerm: null };
  }
}

module.exports = { extractAndSave, getFacts, buildLongTermSummary };
