const DailyCompanion = require('../models/DailyCompanion');
const UserMemory = require('../models/UserMemory');
const MemoryFact = require('../models/MemoryFact');
const GoalTracking = require('../models/GoalTracking');
const CompanionJourney = require('../models/CompanionJourney');

const CATEGORY_LABELS = {
  ansiedade: 'ansiedade',
  sono: 'sono',
  rotina: 'rotina',
  produtividade: 'produtividade',
  espiritualidade: 'espiritualidade',
  autoestima: 'autoestima',
  habitos: 'hábitos',
  relacionamentos: 'relacionamentos',
};

const STAGE_LABELS = {
  ansiedade: ['Identificação', 'Compreensão', 'Gestão', 'Equilíbrio', 'Consolidação'],
  sono: ['Identificação', 'Regularização', 'Estabilização', 'Aprimoramento', 'Consolidação'],
  rotina: ['Identificação', 'Estruturação', 'Consistência', 'Aprimoramento', 'Consolidação'],
  produtividade: ['Identificação', 'Planejamento', 'Execução', 'Otimização', 'Consolidação'],
  espiritualidade: ['Despertar', 'Exploração', 'Aprofundamento', 'Integração', 'Consolidação'],
  autoestima: ['Identificação', 'Aceitação', 'Valorização', 'Fortalecimento', 'Consolidação'],
  habitos: ['Identificação', 'Introdução', 'Consistência', 'Automatização', 'Consolidação'],
  relacionamentos: ['Identificação', 'Conexão', 'Aprofundamento', 'Fortalecimento', 'Consolidação'],
};

const PROACTIVE_CAT_MAP = {
  sono: 'sleep',
  emoções: 'emotions',
  emocoes: 'emotions',
  sonhos: 'dreams',
  hábitos: 'habits',
  habitos: 'habits',
  objetivos: 'goals',
  saúde: 'encouragement',
  saude: 'encouragement',
  padrões: 'reflection',
  padroes: 'reflection',
  evolução: 'encouragement',
  evolucao: 'encouragement',
};

const FACT_CAT_MAP = {
  'Sono': 'sleep',
  'Emoções': 'emotions',
  'Emocoes': 'emotions',
  'Sonhos': 'dreams',
  'Hábitos': 'habits',
  'Habitos': 'habits',
  'Objetivos': 'goals',
  'Saúde': 'encouragement',
  'Saude': 'encouragement',
  'Família': 'relationships',
  'Familia': 'relationships',
  'Trabalho': 'encouragement',
  'Preferências': 'reflection',
  'Preferencias': 'reflection',
  'Medos': 'emotions',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysSince(date) {
  if (!date) return 999;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function priorityScore(priority) {
  return { critical: 1000, high: 700, medium: 400, low: 100 }[priority] || 0;
}

function getExistingToday(userId) {
  return DailyCompanion.findOne({ userId, date: todayStr() }).lean();
}

function getRecentMessages(userId, limit) {
  return DailyCompanion.find({ userId })
    .sort({ date: -1 })
    .limit(limit)
    .select('title message date')
    .lean();
}

function isDuplicate(candidate, recentMessages) {
  const cTitle = candidate.title.toLowerCase().trim();
  const cMsg = candidate.message.toLowerCase().trim();
  for (const m of recentMessages) {
    if (m.title.toLowerCase().trim() === cTitle) return true;
    if (m.message.toLowerCase().trim() === cMsg) return true;
  }
  return false;
}

function buildFromProactiveInsights(userMemory) {
  const candidates = [];
  if (!userMemory || !userMemory.proactiveInsights) return candidates;

  for (const insight of userMemory.proactiveInsights) {
    if (!insight.isActive) continue;
    if (insight.priority !== 'critical' && insight.priority !== 'high') continue;

    const category = PROACTIVE_CAT_MAP[insight.category] || 'encouragement';

    candidates.push({
      title: insight.title,
      message: insight.description,
      category,
      priority: insight.priority,
      source: 'proactive_insight',
      reason: `Insight ${insight.priority}: ${insight.title}`,
      score: priorityScore(insight.priority) + 50,
    });
  }

  return candidates;
}

async function buildFromCompanionJourneys(userId) {
  const candidates = [];

  const journeys = await CompanionJourney.find({ userId, status: 'active' })
    .sort({ importance: -1, progress: -1, updatedAt: -1 })
    .limit(5)
    .lean();

  for (const j of journeys) {
    if (j.importance < 5) continue;

    const priority = j.importance >= 8 ? 'high' : 'medium';
    const stages = STAGE_LABELS[j.category] || [];
    const stageIdx = Math.min(Math.floor(j.progress / 25), stages.length - 1);
    const stageName = stageIdx >= 0 ? stages[stageIdx] : '';
    const label = CATEGORY_LABELS[j.category] || j.category;
    const category = PROACTIVE_CAT_MAP[j.category] || 'encouragement';

    let message;
    if (stageName && j.progress > 0) {
      message = `Sua jornada de ${label} está na fase de ${stageName}. Continue evoluindo!`;
    } else {
      message = `Sua jornada de ${label} continua em andamento. Você já percorreu um bom caminho.`;
    }

    candidates.push({
      title: `Jornada: ${label}`,
      message,
      category,
      priority,
      source: 'companion_journey',
      reason: `Jornada ativa: ${label} (progresso: ${j.progress}%)`,
      score: priorityScore(priority) + j.progress + j.importance,
    });
  }

  return candidates;
}

async function buildFromGoals(userId) {
  const candidates = [];

  const goals = await GoalTracking.find({ userId, status: 'active' })
    .sort({ importance: -1, progress: -1 })
    .limit(5)
    .lean();

  for (const g of goals) {
    if (g.progress <= 0) continue;

    const priority = g.importance === 'high' && g.progress >= 30 ? 'high' : 'medium';

    candidates.push({
      title: `Objetivo: ${g.title}`,
      message: `Seu objetivo "${g.title}" está com ${g.progress}% de progresso. Continue assim!`,
      category: 'goals',
      priority,
      source: 'goal_tracking',
      reason: `Objetivo em progresso: ${g.title} (${g.progress}%)`,
      score: priorityScore(priority) + g.progress,
    });
  }

  return candidates;
}

async function buildFromAchievements(userId) {
  const candidates = [];

  const goals = await GoalTracking.find({ userId, status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(3)
    .lean();

  for (const g of goals) {
    const daysAgo = daysSince(g.completedAt);
    if (daysAgo > 14) continue;

    const priority = daysAgo <= 3 ? 'high' : 'medium';

    candidates.push({
      title: `Conquista: ${g.title}`,
      message: `Parabéns! Você completou o objetivo "${g.title}". Isso é uma grande conquista!`,
      category: 'achievements',
      priority,
      source: 'goal_tracking',
      reason: `Objetivo concluído: ${g.title}`,
      score: priorityScore(priority) + (14 - daysAgo),
    });
  }

  return candidates;
}

async function buildFromMemoryFacts(userId) {
  const candidates = [];

  const facts = await MemoryFact.find({ userId, isActive: true })
    .sort({ importanceScore: -1 })
    .limit(5)
    .lean();

  for (const f of facts) {
    if (f.importanceScore < 60) continue;

    const priority = f.importanceScore >= 80 ? 'medium' : 'low';
    const category = FACT_CAT_MAP[f.category] || 'reflection';
    const truncated = f.fact.length > 55 ? f.fact.substring(0, 52) + '...' : f.fact;

    candidates.push({
      title: `Sabia disso: ${truncated}`,
      message: `Lembrei que você mencionou: "${f.fact}". Isso parece importante para você.`,
      category,
      priority,
      source: 'memory_fact',
      reason: `Fato importante: ${f.fact.substring(0, 60)}`,
      score: priorityScore(priority) + f.importanceScore * 0.5,
    });
  }

  return candidates;
}

function buildFromMotivation(userMemory, totalDreams, lastDreamDays) {
  const candidates = [];

  if (!userMemory) {
    candidates.push({
      title: 'Bem-vindo ao Dream Line',
      message: 'Estou aqui para acompanhar você na sua jornada de autoconhecimento. Que tal registrar seu primeiro sonho ou emoção hoje?',
      category: 'motivation',
      priority: 'medium',
      source: 'system',
      reason: 'Novo usuário — mensagem de boas-vindas',
      score: priorityScore('medium') + 20,
    });
    return candidates;
  }

  const engagementScore = userMemory.behavior?.engagementScore ?? null;

  if (totalDreams > 0 && lastDreamDays >= 7) {
    candidates.push({
      title: 'Que tal registrar um sonho?',
      message: `Faz ${lastDreamDays} dias que você não registra um sonho. Que tal compartilhar o que sonhou hoje?`,
      category: 'dreams',
      priority: lastDreamDays >= 14 ? 'medium' : 'low',
      source: 'system',
      reason: `Inatividade em sonhos: ${lastDreamDays} dias`,
      score: priorityScore(lastDreamDays >= 14 ? 'medium' : 'low') + Math.min(lastDreamDays, 30),
    });
  }

  if (engagementScore !== null && engagementScore < 30 && totalDreams > 0) {
    candidates.push({
      title: 'Vamos retomar?',
      message: 'Percebo que faz um tempo que não nos falamos. Estou aqui para ajudar no que precisar.',
      category: 'motivation',
      priority: 'low',
      source: 'system',
      reason: `Baixo engajamento: score ${engagementScore}`,
      score: priorityScore('low') + 10,
    });
  }

  return candidates;
}

function buildFallbackCandidates() {
  return [
    {
      title: 'Bom dia!',
      message: 'Hoje é um novo dia para cuidar de você. Pequenos passos fazem toda a diferença.',
      category: 'motivation',
      priority: 'low',
      source: 'system',
      reason: 'Mensagem motivacional geral',
      score: priorityScore('low') + 5,
    },
    {
      title: 'Como você está?',
      message: 'Passando para saber como você está hoje. Que tal fazer um breve check-in?',
      category: 'reflection',
      priority: 'low',
      source: 'system',
      reason: 'Check-in geral',
      score: priorityScore('low'),
    },
  ];
}

async function generateDailyMessage(userId) {
  try {
    const existing = await getExistingToday(userId);
    if (existing) return existing;

    const userMemory = await UserMemory.findOne({ userId }).lean();
    const recentMessages = await getRecentMessages(userId, 5);

    const totalDreams = userMemory?.stats?.totalDreams || 0;
    const lastDreamDays = daysSince(userMemory?.stats?.lastDreamDate);

    const allCandidates = [
      ...buildFromProactiveInsights(userMemory),
      ...await buildFromCompanionJourneys(userId),
      ...await buildFromGoals(userId),
      ...await buildFromAchievements(userId),
      ...await buildFromMemoryFacts(userId),
      ...buildFromMotivation(userMemory, totalDreams, lastDreamDays),
      ...buildFallbackCandidates(),
    ];

    allCandidates.sort((a, b) => b.score - a.score);

    let selected = null;
    for (const c of allCandidates) {
      if (!isDuplicate(c, recentMessages)) {
        selected = c;
        break;
      }
    }

    if (!selected) {
      selected = {
        title: 'Como você está?',
        message: 'Passando para saber como você está hoje. Que tal fazer um breve check-in?',
        category: 'reflection',
        priority: 'low',
        source: 'system',
        reason: 'Nenhum candidato disponível — fallback',
        score: 0,
      };
    }

    const daily = await DailyCompanion.create({
      userId,
      date: todayStr(),
      title: selected.title,
      message: selected.message,
      category: selected.category,
      priority: selected.priority,
      source: selected.source,
      reason: selected.reason,
      generatedAt: new Date(),
      metadata: { score: selected.score },
    });

    return daily.toObject();
  } catch (err) {
    if (err.code === 11000) {
      return await DailyCompanion.findOne({ userId, date: todayStr() }).lean();
    }
    console.error('[DailyCompanion] generateDailyMessage error:', err.message);
    return null;
  }
}

async function getTodayMessage(userId) {
  try {
    return await DailyCompanion.findOne({ userId, date: todayStr() }).lean();
  } catch (err) {
    console.error('[DailyCompanion] getTodayMessage error:', err.message);
    return null;
  }
}

async function markViewed(id) {
  try {
    return await DailyCompanion.findByIdAndUpdate(
      id,
      { $set: { viewed: true, viewedAt: new Date() } },
      { new: true },
    ).lean();
  } catch (err) {
    console.error('[DailyCompanion] markViewed error:', err.message);
    return null;
  }
}

async function markDismissed(id) {
  try {
    return await DailyCompanion.findByIdAndUpdate(
      id,
      { $set: { dismissed: true, dismissedAt: new Date() } },
      { new: true },
    ).lean();
  } catch (err) {
    console.error('[DailyCompanion] markDismissed error:', err.message);
    return null;
  }
}

module.exports = { generateDailyMessage, getTodayMessage, markViewed, markDismissed };
