const CompanionJourney = require('../models/CompanionJourney');

const STAGES = {
  ansiedade: ['Identificação', 'Compreensão', 'Gestão', 'Equilíbrio', 'Consolidação'],
  sono: ['Identificação', 'Regularização', 'Estabilização', 'Aprimoramento', 'Consolidação'],
  rotina: ['Identificação', 'Estruturação', 'Consistência', 'Aprimoramento', 'Consolidação'],
  produtividade: ['Identificação', 'Planejamento', 'Execução', 'Otimização', 'Consolidação'],
  espiritualidade: ['Despertar', 'Exploração', 'Aprofundamento', 'Integração', 'Consolidação'],
  autoestima: ['Identificação', 'Aceitação', 'Valorização', 'Fortalecimento', 'Consolidação'],
  habitos: ['Identificação', 'Introdução', 'Consistência', 'Automatização', 'Consolidação'],
  relacionamentos: ['Identificação', 'Conexão', 'Aprofundamento', 'Fortalecimento', 'Consolidação'],
};

const LABELS = {
  ansiedade: 'Reduzir ansiedade',
  sono: 'Melhorar qualidade do sono',
  rotina: 'Criar rotina saudável',
  produtividade: 'Aumentar produtividade',
  espiritualidade: 'Desenvolver espiritualidade',
  autoestima: 'Melhorar autoestima',
  habitos: 'Melhorar hábitos',
  relacionamentos: 'Fortalecer relacionamentos',
};

function stageIndex(score, category) {
  const stages = STAGES[category];
  if (score >= 75) return 4;
  if (score >= 55) return 3;
  if (score >= 35) return 2;
  if (score >= 15) return 1;
  return 0;
}

function clamp(v) { return Math.min(100, Math.max(0, v)); }

function detectAnxiety(ctx) {
  let score = 0;
  const evidence = [];
  if (ctx.emotionStats && ctx.emotionStats.predominant === 'ansiedade') {
    score += 25; evidence.push({ source: 'emotionStats', detail: 'Emoção predominante: ansiedade' });
  }
  if (ctx.emotionStats && ctx.emotionStats.averageIntensity > 6) {
    score += 15; evidence.push({ source: 'emotionStats', detail: 'Intensidade emocional elevada' });
  }
  if (ctx.emotionStats && ctx.emotionStats.intensityTrend) {
    const recent = ctx.emotionStats.intensityTrend['7d'] || 0;
    const medium = ctx.emotionStats.intensityTrend['30d'] || recent;
    if (recent > medium) { score += 15; evidence.push({ source: 'emotionStats', detail: 'Tendência de aumento da intensidade emocional' }); }
    if (recent < medium && medium > 0) { score -= 10; evidence.push({ source: 'emotionStats', detail: 'Tendência de redução da intensidade emocional' }); }
  }
  if (ctx.lifeInsights && ctx.lifeInsights.attentionPoints) {
    const pts = ctx.lifeInsights.attentionPoints.filter(a => a.toLowerCase().includes('ansiedade'));
    if (pts.length > 0) { score += 20; evidence.push({ source: 'lifeInsights', detail: 'Ponto de atenção: ' + pts[0] }); }
  }
  if (ctx.proactiveInsights) {
    const ins = ctx.proactiveInsights.filter(i => (i.title || '').toLowerCase().includes('ansiedade'));
    if (ins.length > 0) { score += 15; evidence.push({ source: 'proactiveInsights', detail: 'Padrão: ' + ins[0].title }); }
  }
  if (ctx.timeline) {
    const ev = ctx.timeline.filter(e => (e.category || '').toLowerCase() === 'emocional' && (e.title || '').toLowerCase().includes('ansiedade'));
    if (ev.length > 0) { score += 10; evidence.push({ source: 'timeline', detail: 'Evento emocional relacionado' }); }
  }
  if (ctx.activeGoals) {
    const g = ctx.activeGoals.filter(x => (x.title || '').toLowerCase().includes('ansiedade') || (x.category || '').toLowerCase() === 'ansiedade');
    if (g.length > 0) { score += 15; evidence.push({ source: 'goalTracking', detail: 'Objetivo: ' + g[0].title }); }
  }
  const finalScore = clamp(score);
  return { score: finalScore, evidence, stage: STAGES.ansiedade[stageIndex(finalScore, 'ansiedade')], progress: Math.round(finalScore) };
}

function detectSleep(ctx) {
  let score = 0;
  const evidence = [];
  if (ctx.sleepStats && ctx.sleepStats.avgSleepHours != null) {
    const h = ctx.sleepStats.avgSleepHours;
    if (h < 5) { score += 30; evidence.push({ source: 'sleepStats', detail: 'Média de sono crítica: ' + h + 'h' }); }
    else if (h < 6) { score += 25; evidence.push({ source: 'sleepStats', detail: 'Média de sono baixa: ' + h + 'h' }); }
    else if (h < 7) { score += 15; evidence.push({ source: 'sleepStats', detail: 'Média de sono abaixo do ideal: ' + h + 'h' }); }
    else if (h >= 7 && h <= 9) { score -= 15; evidence.push({ source: 'sleepStats', detail: 'Sono dentro da faixa ideal' }); }
  }
  if (ctx.lifeInsights && ctx.lifeInsights.attentionPoints) {
    const pts = ctx.lifeInsights.attentionPoints.filter(a => a.toLowerCase().includes('sono') || a.toLowerCase().includes('dormir'));
    if (pts.length > 0) { score += 20; evidence.push({ source: 'lifeInsights', detail: 'Ponto de atenção: ' + pts[0] }); }
  }
  if (ctx.dreamCoach && ctx.dreamCoach.concerns) {
    const c = ctx.dreamCoach.concerns.filter(x => x.toLowerCase().includes('sono') || x.toLowerCase().includes('dormir') || x.toLowerCase().includes('insônia'));
    if (c.length > 0) { score += 15; evidence.push({ source: 'dreamCoach', detail: 'Preocupação: ' + c[0] }); }
  }
  if (ctx.activeGoals) {
    const g = ctx.activeGoals.filter(x => (x.title || '').toLowerCase().includes('sono') || (x.title || '').toLowerCase().includes('dormir'));
    if (g.length > 0) { score += 15; evidence.push({ source: 'goalTracking', detail: 'Objetivo: ' + g[0].title }); }
  }
  if (ctx.timeline) {
    const ev = ctx.timeline.filter(e => (e.title || '').toLowerCase().includes('sono') || (e.title || '').toLowerCase().includes('insônia'));
    if (ev.length > 0) { score += 10; evidence.push({ source: 'timeline', detail: 'Evento relacionado' }); }
  }
  if (ctx.continuousNarrative) {
    const n = ctx.continuousNarrative.filter(x => x.category === 'sono' && x.summary.toLowerCase().includes('déficit'));
    if (n.length > 0) { score += 10; evidence.push({ source: 'narrativeContinuity', detail: 'Narrativa indica déficit de sono' }); }
  }
  const finalScore = clamp(score);
  return { score: finalScore, evidence, stage: STAGES.sono[stageIndex(finalScore, 'sono')], progress: 100 - Math.round(finalScore) };
}

function detectRoutine(ctx) {
  let score = 0;
  const evidence = [];
  if (ctx.lifeInsights && ctx.lifeInsights.habits) {
    if (ctx.lifeInsights.habits.length === 0) { score += 15; evidence.push({ source: 'lifeInsights', detail: 'Nenhum hábito consolidado' }); }
    else if (ctx.lifeInsights.habits.length > 2) { score -= 15; evidence.push({ source: 'lifeInsights', detail: 'Hábitos já consolidados' }); }
  }
  if (ctx.lifeInsights && ctx.lifeInsights.attentionPoints) {
    const pts = ctx.lifeInsights.attentionPoints.filter(a => a.toLowerCase().includes('rotina') || a.toLowerCase().includes('organização') || a.toLowerCase().includes('disciplina'));
    if (pts.length > 0) { score += 20; evidence.push({ source: 'lifeInsights', detail: 'Ponto de atenção: ' + pts[0] }); }
  }
  if (ctx.dreamCoach && ctx.dreamCoach.evolution) {
    const ev = ctx.dreamCoach.evolution.filter(e => e.toLowerCase().includes('rotina') || e.toLowerCase().includes('hábito'));
    if (ev.length > 0) { score += 15; evidence.push({ source: 'dreamCoach', detail: 'Evolução: ' + ev[0] }); }
  }
  if (ctx.sleepStats && ctx.sleepStats.avgSleepHours != null && ctx.sleepStats.avgSleepHours >= 7 && ctx.sleepStats.avgSleepHours <= 9) {
    score -= 10; evidence.push({ source: 'sleepStats', detail: 'Sono regular indica rotina' });
  }
  if (ctx.activeGoals) {
    const g = ctx.activeGoals.filter(x => (x.title || '').toLowerCase().includes('rotina') || (x.title || '').toLowerCase().includes('hábito'));
    if (g.length > 0) { score += 20; evidence.push({ source: 'goalTracking', detail: 'Objetivo: ' + g[0].title }); }
  }
  const finalScore = clamp(score);
  return { score: finalScore, evidence, stage: STAGES.rotina[stageIndex(finalScore, 'rotina')], progress: 100 - Math.round(finalScore) };
}

function detectProductivity(ctx) {
  let score = 0;
  const evidence = [];
  if (ctx.activeGoals) {
    const wg = ctx.activeGoals.filter(g => (g.category || '').toLowerCase() === 'trabalho' || (g.category || '').toLowerCase() === 'estudos' || (g.title || '').toLowerCase().includes('produtividade'));
    if (wg.length > 0) { score += 20; evidence.push({ source: 'goalTracking', detail: 'Objetivo: ' + wg[0].title }); }
    const lp = ctx.activeGoals.filter(g => (g.progress || 0) <= 30);
    if (lp.length >= 2) { score += 15; evidence.push({ source: 'goalTracking', detail: 'Múltiplos objetivos com baixo progresso' }); }
  }
  if (ctx.completedGoals && ctx.completedGoals.length > 0) { score -= 15; evidence.push({ source: 'goalTracking', detail: ctx.completedGoals.length + ' objetivo(s) concluído(s)' }); }
  if (ctx.proactiveInsights) {
    const ins = ctx.proactiveInsights.filter(i => (i.title || '').toLowerCase().includes('produtividade') || (i.title || '').toLowerCase().includes('foco') || (i.title || '').toLowerCase().includes('procrastinação'));
    if (ins.length > 0) { score += 20; evidence.push({ source: 'proactiveInsights', detail: 'Padrão: ' + ins[0].title }); }
  }
  if (ctx.timeline) {
    const ev = ctx.timeline.filter(e => (e.category || '').toLowerCase() === 'profissional' || (e.title || '').toLowerCase().includes('trabalho'));
    if (ev.length > 1) { score += 10; evidence.push({ source: 'timeline', detail: 'Eventos profissionais recentes' }); }
  }
  const finalScore = clamp(score);
  return { score: finalScore, evidence, stage: STAGES.produtividade[stageIndex(finalScore, 'produtividade')], progress: 100 - Math.round(finalScore) };
}

function detectSpirituality(ctx) {
  let score = 0;
  const evidence = [];
  if (ctx.dreamStats && ctx.dreamStats.categories) {
    const sc = ctx.dreamStats.categories.filter(c => (c.category || '').toLowerCase().includes('espiritual'));
    if (sc.length > 0) { score += 20; evidence.push({ source: 'dreamStats', detail: 'Categoria espiritual nos sonhos' }); }
  }
  if (ctx.activeGoals) {
    const g = ctx.activeGoals.filter(x => (x.category || '').toLowerCase() === 'espiritualidade' || (x.title || '').toLowerCase().includes('espiritual') || (x.title || '').toLowerCase().includes('meditação'));
    if (g.length > 0) { score += 25; evidence.push({ source: 'goalTracking', detail: 'Objetivo: ' + g[0].title }); }
  }
  if (ctx.lifeInsights && ctx.lifeInsights.habits) {
    const h = ctx.lifeInsights.habits.filter(x => x.toLowerCase().includes('meditação') || x.toLowerCase().includes('oração') || x.toLowerCase().includes('espiritual'));
    if (h.length > 0) { score -= 15; evidence.push({ source: 'lifeInsights', detail: 'Prática espiritual consolidada' }); }
  }
  if (ctx.lifeInsights && ctx.lifeInsights.attentionPoints) {
    const pts = ctx.lifeInsights.attentionPoints.filter(a => a.toLowerCase().includes('espiritual') || a.toLowerCase().includes('propósito') || a.toLowerCase().includes('significado'));
    if (pts.length > 0) { score += 20; evidence.push({ source: 'lifeInsights', detail: 'Ponto de atenção: ' + pts[0] }); }
  }
  const finalScore = clamp(score);
  return { score: finalScore, evidence, stage: STAGES.espiritualidade[stageIndex(finalScore, 'espiritualidade')], progress: 100 - Math.round(finalScore) };
}

function detectSelfEsteem(ctx) {
  let score = 0;
  const evidence = [];
  if (ctx.lifeInsights && ctx.lifeInsights.attentionPoints) {
    const pts = ctx.lifeInsights.attentionPoints.filter(a => a.toLowerCase().includes('autoestima') || a.toLowerCase().includes('autoconfiança') || a.toLowerCase().includes('autocobrança') || a.toLowerCase().includes('insegurança'));
    if (pts.length > 0) { score += 25; evidence.push({ source: 'lifeInsights', detail: 'Ponto de atenção: ' + pts[0] }); }
  }
  if (ctx.lifeInsights && ctx.lifeInsights.strengths && ctx.lifeInsights.strengths.length > 0) {
    score -= 15; evidence.push({ source: 'lifeInsights', detail: 'Pontos fortes identificados' });
  }
  if (ctx.emotionStats && ctx.emotionStats.predominant && ['tristeza', 'medo', 'frustração'].includes(ctx.emotionStats.predominant)) {
    score += 20; evidence.push({ source: 'emotionStats', detail: 'Emoção predominante: ' + ctx.emotionStats.predominant });
  }
  if (ctx.activeGoals) {
    const g = ctx.activeGoals.filter(x => (x.title || '').toLowerCase().includes('autoestima') || (x.title || '').toLowerCase().includes('autoconfiança'));
    if (g.length > 0) { score += 20; evidence.push({ source: 'goalTracking', detail: 'Objetivo: ' + g[0].title }); }
  }
  if (ctx.completedGoals && ctx.completedGoals.length > 0) { score -= 10; evidence.push({ source: 'goalTracking', detail: 'Metas concluídas fortalecem autoestima' }); }
  if (ctx.importantRelationships) {
    const high = ctx.importantRelationships.filter(r => (r.emotionalWeight || 0) >= 70);
    if (high.length > 0) { score -= 10; evidence.push({ source: 'relationshipMemory', detail: 'Rede de apoio ativa' }); }
  }
  if (ctx.qualitySummary && ctx.qualitySummary.averageConversationScore > 0) {
    if (ctx.qualitySummary.averageConversationScore >= 70) { score -= 10; }
  }
  const finalScore = clamp(score);
  return { score: finalScore, evidence, stage: STAGES.autoestima[stageIndex(finalScore, 'autoestima')], progress: 100 - Math.round(finalScore) };
}

function detectHabits(ctx) {
  let score = 0;
  const evidence = [];
  if (ctx.lifeInsights && ctx.lifeInsights.habits) {
    if (ctx.lifeInsights.habits.length === 0) { score += 20; evidence.push({ source: 'lifeInsights', detail: 'Nenhum hábito registrado' }); }
    else if (ctx.lifeInsights.habits.length <= 2) { score += 10; evidence.push({ source: 'lifeInsights', detail: 'Poucos hábitos consolidados' }); }
    else { score -= 15; evidence.push({ source: 'lifeInsights', detail: 'Múltiplos hábitos já presentes' }); }
  }
  if (ctx.lifeInsights && ctx.lifeInsights.attentionPoints) {
    const pts = ctx.lifeInsights.attentionPoints.filter(a => a.toLowerCase().includes('hábito') || a.toLowerCase().includes('vício') || a.toLowerCase().includes('mudar'));
    if (pts.length > 0) { score += 20; evidence.push({ source: 'lifeInsights', detail: 'Ponto de atenção: ' + pts[0] }); }
  }
  if (ctx.activeGoals) {
    const g = ctx.activeGoals.filter(x => (x.category || '').toLowerCase() === 'hábitos' || (x.title || '').toLowerCase().includes('hábito'));
    if (g.length > 0) { score += 20; evidence.push({ source: 'goalTracking', detail: 'Objetivo: ' + g[0].title }); }
  }
  if (ctx.dreamCoach && ctx.dreamCoach.evolution) {
    const ev = ctx.dreamCoach.evolution.filter(e => e.toLowerCase().includes('hábito') || e.toLowerCase().includes('rotina'));
    if (ev.length > 0) { score += 10; evidence.push({ source: 'dreamCoach', detail: 'Evolução: ' + ev[0] }); }
  }
  if (ctx.sleepStats && ctx.sleepStats.avgSleepHours != null && ctx.sleepStats.avgSleepHours >= 7) {
    score -= 10; evidence.push({ source: 'sleepStats', detail: 'Sono adequado indica bons hábitos' });
  }
  const finalScore = clamp(score);
  return { score: finalScore, evidence, stage: STAGES.habitos[stageIndex(finalScore, 'habitos')], progress: 100 - Math.round(finalScore) };
}

function detectRelationships(ctx) {
  let score = 0;
  const evidence = [];
  if (ctx.importantRelationships && ctx.importantRelationships.length > 0) {
    const lowWeight = ctx.importantRelationships.filter(r => (r.emotionalWeight || 0) < 50);
    if (lowWeight.length > 0) { score += 15; evidence.push({ source: 'relationshipMemory', detail: 'Relacionamentos com baixo peso emocional' }); }
    const recent = ctx.importantRelationships.filter(r => {
      if (!r.lastMention) return false;
      return (Date.now() - new Date(r.lastMention).getTime()) < 7 * 86400000;
    });
    if (recent.length === 0 && ctx.importantRelationships.length > 0) { score += 15; evidence.push({ source: 'relationshipMemory', detail: 'Relacionamentos sem menções recentes' }); }
  } else {
    score += 20; evidence.push({ source: 'relationshipMemory', detail: 'Nenhum relacionamento registrado' });
  }
  if (ctx.lifeInsights && ctx.lifeInsights.attentionPoints) {
    const pts = ctx.lifeInsights.attentionPoints.filter(a => a.toLowerCase().includes('relacionamento') || a.toLowerCase().includes('família') || a.toLowerCase().includes('amizade') || a.toLowerCase().includes('social'));
    if (pts.length > 0) { score += 20; evidence.push({ source: 'lifeInsights', detail: 'Ponto de atenção: ' + pts[0] }); }
  }
  if (ctx.activeGoals) {
    const g = ctx.activeGoals.filter(x => (x.category || '').toLowerCase() === 'família' || (x.title || '').toLowerCase().includes('relacionamento'));
    if (g.length > 0) { score += 20; evidence.push({ source: 'goalTracking', detail: 'Objetivo: ' + g[0].title }); }
  }
  if (ctx.timeline) {
    const ev = ctx.timeline.filter(e => (e.category || '').toLowerCase() === 'família' || (e.category || '').toLowerCase() === 'relacionamentos');
    if (ev.length > 0) { score += 10; evidence.push({ source: 'timeline', detail: 'Eventos sociais/familiares registrados' }); }
  }
  const finalScore = clamp(score);
  return { score: finalScore, evidence, stage: STAGES.relacionamentos[stageIndex(finalScore, 'relacionamentos')], progress: 100 - Math.round(finalScore) };
}

const DETECTORS = {
  ansiedade: detectAnxiety,
  sono: detectSleep,
  rotina: detectRoutine,
  produtividade: detectProductivity,
  espiritualidade: detectSpirituality,
  autoestima: detectSelfEsteem,
  habitos: detectHabits,
  relacionamentos: detectRelationships,
};

function detectJourneys(ctx) {
  const results = [];
  for (const [category, detect] of Object.entries(DETECTORS)) {
    const result = detect(ctx);
    if (result.score >= 20) {
      results.push({
        category,
        title: LABELS[category],
        ...result,
        importance: Math.min(10, Math.max(1, Math.round(result.score / 10))),
      });
    }
  }
  results.sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance;
    if (b.progress !== a.progress) return b.progress - a.progress;
    return 0;
  });
  return results.slice(0, 8);
}

async function getActiveJourneys(userId) {
  const journeys = await CompanionJourney.find({ userId, status: 'active' })
    .sort({ importance: -1, progress: -1, updatedAt: -1 })
    .limit(5)
    .lean();
  return journeys.map(j => ({
    title: j.title,
    category: j.category,
    status: j.status,
    progress: j.progress,
    importance: j.importance,
    currentStage: j.currentStage,
    summary: j.summary,
    lastInteraction: j.lastInteraction,
    updatedAt: j.updatedAt,
  }));
}

async function processJourneys(userId, ctx) {
  try {
    const detected = detectJourneys(ctx);
    const existing = await CompanionJourney.find({ userId }).lean();
    const existingMap = {};
    for (const e of existing) {
      if (!existingMap[e.category]) existingMap[e.category] = [];
      existingMap[e.category].push(e);
    }

    const now = new Date();
    for (const d of detected) {
      const existingForCategory = existingMap[d.category] || [];
      const active = existingForCategory.find(e => e.status === 'active');

      if (active) {
        await CompanionJourney.updateOne(
          { _id: active._id },
          {
            $set: {
              progress: d.progress,
              importance: d.importance,
              currentStage: d.stage,
              lastInteraction: now,
              updatedAt: now,
              summary: d.title + ' - ' + d.stage,
              nextSuggestion: d.progress >= 75 ? 'Continue mantendo a consistência' : d.progress >= 50 ? 'Persista na evolução atual' : 'Pequenos passos diários fazem diferença',
            },
            $push: {
              evidence: { $each: d.evidence.slice(0, 2) },
            },
          }
        );
        if (d.progress >= 85) {
          await completeJourney(userId, active.category, 'Evolução consistente detectada automaticamente');
        }
      } else {
        const paused = existingForCategory.find(e => e.status === 'paused');
        if (paused) {
          await CompanionJourney.updateOne(
            { _id: paused._id },
            {
              $set: {
                status: 'active',
                progress: d.progress,
                importance: d.importance,
                currentStage: d.stage,
                lastInteraction: now,
                updatedAt: now,
                summary: d.title + ' - ' + d.stage,
                nextSuggestion: 'Jornada retomada naturalmente',
              },
              $push: {
                evidence: { $each: d.evidence.slice(0, 2) },
              },
            }
          );
        } else {
          await CompanionJourney.create({
            userId,
            title: d.title,
            category: d.category,
            status: 'active',
            progress: d.progress,
            importance: d.importance,
            currentStage: d.stage,
            summary: d.title + ' - ' + d.stage,
            nextSuggestion: 'Início natural da jornada',
            evidence: d.evidence.slice(0, 3),
            startedAt: now,
            lastInteraction: now,
          });
        }
      }
    }

    const detectedCategories = new Set(detected.map(d => d.category));
    for (const [category, entries] of Object.entries(existingMap)) {
      for (const e of entries) {
        if (e.status === 'active' && !detectedCategories.has(category)) {
          const daysSinceUpdate = (now - new Date(e.updatedAt)) / 86400000;
          if (daysSinceUpdate >= 14) {
            await pauseJourney(userId, category, 'Sem sinais recentes há ' + Math.round(daysSinceUpdate) + ' dias');
          }
        }
      }
    }
  } catch (err) {
    console.error('[LongTermCompanion] processJourneys error:', err.message);
  }
}

async function completeJourney(userId, category, reason) {
  await CompanionJourney.updateOne(
    { userId, category, status: { $in: ['active', 'paused'] } },
    { $set: { status: 'completed', progress: 100, updatedAt: new Date(), nextSuggestion: '' } }
  );
}

async function pauseJourney(userId, category, reason) {
  await CompanionJourney.updateOne(
    { userId, category, status: 'active' },
    { $set: { status: 'paused', updatedAt: new Date(), nextSuggestion: reason } }
  );
}

module.exports = { detectJourneys, getActiveJourneys, processJourneys, completeJourney, pauseJourney };
