const ConversationMemory = require('../models/ConversationMemory');

const TOPIC_PATTERNS = [
  { pattern: /(?:estou|tô) (?:criando|desenvolvendo|fazendo) (?:um|uma|meu) (.+)/i, importance: 'high' },
  { pattern: /(?:quero|pretendo|vou|gostaria de|planejo) (.+)/i, importance: 'high' },
  { pattern: /(?:estou|tô) tentando (.+)/i, importance: 'medium' },
  { pattern: /(?:comecei|iniciei) (?:a|um|uma) (.+)/i, importance: 'medium' },
  { pattern: /(?:meu objetivo|minha meta|meu plano|meu sonho) (.+)/i, importance: 'high' },

  { pattern: /(?:estou|tô) (?:pensando em|considerando|avaliando) (.+)/i, importance: 'medium' },
  { pattern: /(?:decidi|resolvi) (.+)/i, importance: 'medium' },
  { pattern: /(?:preciso|devo|tenho que) (.+)/i, importance: 'medium' },

  { pattern: /(?:quero) melhorar (.+)/i, importance: 'high' },
  { pattern: /(?:tenho) (?:dificuldade|problema) (?:com|para|de) (.+)/i, importance: 'high' },
  { pattern: /(?:sofro|sofre) (?:de|com) (.+)/i, importance: 'high' },
  { pattern: /(?:lido|lidando) (?:com) (.+)/i, importance: 'medium' },

  { pattern: /(?:meu trabalho|minha empresa|meu projeto) (.+)/i, importance: 'high' },
  { pattern: /(?:minha fam[ií]lia|meu relacionamento|meu casamento) (.+)/i, importance: 'high' },
  { pattern: /(?:minha sa[úu]de|meu tratamento|minha terapia) (.+)/i, importance: 'high' },
  { pattern: /(?:meu hobby|meu passatempo|meu esporte) (.+)/i, importance: 'low' },

  { pattern: /(?:comecei a) (.+)/i, importance: 'medium' },
  { pattern: /(?:voltei a) (.+)/i, importance: 'medium' },
  { pattern: /(?:parei de) (.+)/i, importance: 'medium' },

  { pattern: /(?:resolvi|solucionei|consegui|superei) (.+)/i, importance: 'medium', isCompletion: true },
  { pattern: /(?:desisti|abandonei|larguei|n[ãa]o vou mais) (.+)/i, importance: 'medium', isAbandonment: true },
];

const TRIVIAL_PATTERNS = [
  /^(oi|ol[áa]|tudo bem|bom dia|boa tarde|boa noite)/i,
  /^(obrigad[ao]|valeu|brigado)/i,
  /^(sim|n[ãa]o|talvez|ok|okay)/i,
  /^(tchau|at[eé] logo|flw|fui)/i,
  /^(que horas s[ãa]o|qual [eé] a data|que dia [eé] hoje)/i,
  /o que [eé] (sonho|sonhar|pesadelo)/i,
  /qual [eé] o significado/i,
  /^(como funciona|o que [eé] isso)/i,
];

function isTrivial(question) {
  for (const p of TRIVIAL_PATTERNS) {
    if (p.test(question.trim())) return true;
  }
  return question.split(/\s+/).length <= 3;
}

function extractTopics(question, answer) {
  const topics = [];
  const q = question.trim();

  if (isTrivial(q)) return topics;

  for (const { pattern, importance, isCompletion, isAbandonment } of TOPIC_PATTERNS) {
    const match = q.match(pattern);
    if (!match) continue;

    const topicText = match[1].replace(/[.,!?]+$/, '').trim();
    if (topicText.length < 3) continue;

    const short = topicText.length > 60 ? topicText.substring(0, 57) + '...' : topicText;

    if (isCompletion) {
      topics.push({ topic: short, summary: short, status: 'completed', importance });
    } else if (isAbandonment) {
      topics.push({ topic: short, summary: short, status: 'abandoned', importance });
    } else {
      topics.push({ topic: short, summary: short, status: 'active', importance });
    }
  }

  return topics;
}

function inferTopicType(topic, question) {
  const q = question.toLowerCase();
  if (/sono|dormir|ins[oô]nia|acordar/i.test(q)) return 'sono';
  if (/sonh[oa]|pesadelo|sonhei/i.test(q)) return 'sonhos';
  if (/ansios[ao]|estresse|triste|depress[aã]o|emo[cç][ãa]o/i.test(q)) return 'emocional';
  if (/trabalho|emprego|carreira|profiss[aã]o/i.test(q)) return 'trabalho';
  if (/fam[ií]lia|filh[oa]|pai|m[ãe]e|irm[aã]o|casamento/i.test(q)) return 'família';
  if (/sa[úu]de|m[eé]dico|doen[cç]a|terapia|tratamento/i.test(q)) return 'saúde';
  if (/exerc[ií]cio|academia|yoga|medita[cç][ãa]o|caminhada/i.test(q)) return 'hábitos';
  return 'objetivos';
}

async function update(userId, conversationId, question, answer) {
  try {
    const topics = extractTopics(question, answer);
    if (topics.length === 0) return;

    for (const t of topics) {
      const existing = await ConversationMemory.findOne({ userId, topic: t.topic });
      if (existing) {
        if (t.status === 'completed' || t.status === 'abandoned') {
          await ConversationMemory.findByIdAndUpdate(existing._id, {
            $set: { status: t.status, lastMention: new Date() },
            $inc: { mentionCount: 1 },
          });
        } else {
          await ConversationMemory.findByIdAndUpdate(existing._id, {
            $set: { lastMention: new Date(), status: 'active' },
            $inc: { mentionCount: 1 },
          });
        }
      } else {
        await ConversationMemory.create({
          userId,
          topic: t.topic,
          summary: t.summary,
          status: t.status,
          importance: t.importance,
          firstMention: new Date(),
          lastMention: new Date(),
          mentionCount: 1,
          sourceConversationId: conversationId,
        }).catch(err => {
          if (err.code !== 11000) console.error('[ConversationMemory] create error:', err.message);
        });
      }
    }
  } catch (err) {
    console.error('[ConversationMemory] update error:', err.message);
  }
}

async function getMemories(userId, limit = 5) {
  try {
    return await ConversationMemory.find({ userId, status: 'active' })
      .sort({ importance: -1, lastMention: -1 })
      .limit(limit)
      .select('topic summary status importance lastMention mentionCount')
      .lean();
  } catch (err) {
    console.error('[ConversationMemory] getMemories error:', err.message);
    return [];
  }
}

module.exports = { update, getMemories };
