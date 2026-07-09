const GoalTracking = require('../models/GoalTracking');

const GOAL_PATTERNS = [
  { pattern: /^(?:quero|gostaria de|pretendo|vou) (.+)/i, importance: 'medium' },
  { pattern: /^(?:meu objetivo [eé]|minha meta [eé]|meu plano [eé]) (.+)/i, importance: 'high' },
  { pattern: /^(?:quero melhorar|quero aprender|quero diminuir|quero aumentar) (.+)/i, importance: 'high' },
  { pattern: /^(?:meu foco agora [eé]|minha prioridade agora [eé]) (.+)/i, importance: 'high' },
  { pattern: /^(?:estou tentando|t[oô] tentando|venho tentando) (.+)/i, importance: 'medium' },
  { pattern: /^(?:preciso|devo|tenho que) (.+)/i, importance: 'medium' },
  { pattern: /^(?:quero parar de|quero diminuir|quero largar) (.+)/i, importance: 'high' },
];

const CATEGORY_PATTERNS = [
  { pattern: /sono|dormir|ins[oô]nia|acordar|noite/i, category: 'Sono' },
  { pattern: /emo[cç][õo]es|sentimento|tristeza|alegria|raiva|medo/i, category: 'Emoções' },
  { pattern: /ansiedade|ansios[ao]|preocupa[cç][ãa]o|nervos[ao]/i, category: 'Ansiedade' },
  { pattern: /estresse|estressad[ao]|sobrecarga|press[aã]o|exaust[aã]o/i, category: 'Estresse' },
  { pattern: /trabalho|emprego|carreira|profiss[aã]o|promo[cç][ãa]o|reuni[ãa]o/i, category: 'Trabalho' },
  { pattern: /estudo|estudar|faculdade|curso|aprend[ei]zado|escola|universidade/i, category: 'Estudos' },
  { pattern: /fam[ií]lia|filh[oa]|pai|m[ãe]e|irm[aã]o|casamento|relacionamento/i, category: 'Família' },
  { pattern: /h[áa]bito|rotina|medita[cç][ãa]o|exerc[ií]cio|yoga|academia|caminhada|ler|leitura/i, category: 'Hábitos' },
  { pattern: /espiritualidade|espiritual|f[eé]|ora[cç][ãa]o|reza|medita[cç][ãa]o espiritual/i, category: 'Espiritualidade' },
  { pattern: /sonh[oa]|pesadelo|sonhar|sonhei/i, category: 'Sonhos' },
  { pattern: /sa[úu]de|m[eé]dico|terapia|tratamento|doen[cç]a|dor|exame|hospital|rem[eé]dio/i, category: 'Saúde' },
];

const COMPLETION_PATTERNS = [
  /consegui|consegui alcan[cç]ar|alcancei|realizei|cumpri|completei|atingi/i,
  /j[áa] consegui|j[áa] resolvi|j[áa] superei|j[áa] venci|j[áa] passei/i,
  /finalmente consegui|finalmente alcancei|finalmente realizei/i,
  /meu objetivo foi alcan[cç]ado|minha meta foi cumprida/i,
];

const ABANDONMENT_PATTERNS = [
  /desisti|abandonei|larguei|n[ãa]o vou mais/i,
  /deixei de lado|parei de tentar|n[ãa]o quero mais|n[ãa]o tenho mais interesse/i,
];

function inferCategory(text) {
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return 'Geral';
}

function extractGoals(question) {
  const q = question.trim();
  const goals = [];

  for (const { pattern, importance } of GOAL_PATTERNS) {
    const match = q.match(pattern);
    if (!match) continue;

    let title = match[1].replace(/[.,!?;]+$/, '').trim();
    if (title.length < 4) continue;

    title = title.charAt(0).toUpperCase() + title.slice(1);
    if (title.length > 80) title = title.substring(0, 77) + '...';

    const category = inferCategory(q + ' ' + title);

    goals.push({ title, category, importance, status: 'active', progress: 0 });
  }

  return goals;
}

function checkCompletion(question, memoryFacts, insights, timeline) {
  for (const p of COMPLETION_PATTERNS) {
    if (p.test(question)) return true;
  }

  if (!memoryFacts && !insights && !timeline) return false;

  if (insights && insights.achievements && insights.achievements.length > 0) {
    return true;
  }

  return false;
}

function checkAbandonment(question) {
  for (const p of ABANDONMENT_PATTERNS) {
    if (p.test(question)) return true;
  }
  return false;
}

function inferProgress(memoryFacts, insights, timeline, category) {
  let signals = 0;
  let total = 0;

  if (memoryFacts && Array.isArray(memoryFacts)) {
    const relatedFacts = memoryFacts.filter(f => {
      const fc = (f.category || '').toLowerCase();
      const cat = (category || '').toLowerCase();
      return fc === cat || fc.includes(cat);
    });
    total += 3;
    if (relatedFacts.length > 0) signals += Math.min(relatedFacts.length, 3);
  }

  if (insights) {
    if (insights.strengths && insights.strengths.length > 0) {
      total += 2;
      signals += Math.min(insights.strengths.length, 2);
    }
    if (insights.achievements && insights.achievements.length > 0) {
      total += 2;
      signals += Math.min(insights.achievements.length, 2);
    }
    if (insights.habits && insights.habits.length > 0 && category === 'Hábitos') {
      total += 2;
      signals += 2;
    }
  }

  if (timeline && Array.isArray(timeline)) {
    const relatedEvents = timeline.filter(e => {
      const ec = (e.category || '').toLowerCase();
      const cat = (category || '').toLowerCase();
      return ec === cat || ec.includes(cat);
    });
    total += 2;
    if (relatedEvents.length > 0) signals += Math.min(relatedEvents.length, 2);
  }

  if (total === 0) return 0;
  return Math.round((signals / total) * 100);
}

async function update(userId, conversationId, question, answer, context) {
  try {
    const extracted = extractGoals(question);
    const isCompletion = checkCompletion(question, context.longTermMemory, context.lifeInsights, context.timeline);
    const isAbandonment = checkAbandonment(question);

    for (const g of extracted) {
      const existing = await GoalTracking.findOne({ userId, title: g.title });
      if (existing) {
        if (existing.status !== 'active') continue;
        const progress = inferProgress(context.longTermMemory, context.lifeInsights, context.timeline, g.category);
        await GoalTracking.findByIdAndUpdate(existing._id, {
          $set: { progress: Math.max(existing.progress, progress), updatedAt: new Date() },
          $push: { notes: { $each: [], $slice: -5 } },
        });
      } else {
        await GoalTracking.create({
          userId,
          title: g.title,
          category: g.category,
          status: 'active',
          progress: 0,
          importance: g.importance,
          sourceConversationId: conversationId,
        }).catch(err => {
          if (err.code !== 11000) console.error('[GoalTracking] create error:', err.message);
        });
      }
    }

    if (isCompletion) {
      const activeGoals = await GoalTracking.find({ userId, status: 'active' }).sort({ createdAt: -1 }).limit(3).lean();
      for (const goal of activeGoals) {
        const progress = inferProgress(context.longTermMemory, context.lifeInsights, context.timeline, goal.category);
        if (progress >= 70) {
          await GoalTracking.findByIdAndUpdate(goal._id, {
            $set: { status: 'completed', progress: 100, completedAt: new Date(), updatedAt: new Date() },
          });
        }
      }
    }

    if (isAbandonment) {
      const q = question.toLowerCase();
      for (const goal of await GoalTracking.find({ userId, status: 'active' }).lean()) {
        if (q.includes(goal.title.toLowerCase().substring(0, 15))) {
          await GoalTracking.findByIdAndUpdate(goal._id, {
            $set: { status: 'abandoned', updatedAt: new Date() },
          });
        }
      }
    }

    const activeGoals = await GoalTracking.find({ userId, status: 'active' }).lean();
    for (const goal of activeGoals) {
      const progress = inferProgress(context.longTermMemory, context.lifeInsights, context.timeline, goal.category);
      if (progress > goal.progress) {
        await GoalTracking.findByIdAndUpdate(goal._id, {
          $set: { progress, updatedAt: new Date() },
        });
      }
      if (progress >= 90) {
        await GoalTracking.findByIdAndUpdate(goal._id, {
          $set: { status: 'completed', progress: 100, completedAt: new Date(), updatedAt: new Date() },
        });
      }
    }
  } catch (err) {
    console.error('[GoalTracking] update error:', err.message);
  }
}

async function getActiveGoals(userId, limit = 5) {
  try {
    return await GoalTracking.find({ userId, status: 'active' })
      .sort({ importance: -1, progress: -1, createdAt: -1 })
      .limit(limit)
      .select('title category progress importance updatedAt')
      .lean();
  } catch (err) {
    console.error('[GoalTracking] getActiveGoals error:', err.message);
    return [];
  }
}

async function getCompletedGoals(userId, limit = 3) {
  try {
    return await GoalTracking.find({ userId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(limit)
      .select('title category completedAt importance')
      .lean();
  } catch (err) {
    console.error('[GoalTracking] getCompletedGoals error:', err.message);
    return [];
  }
}

module.exports = { update, getActiveGoals, getCompletedGoals };
