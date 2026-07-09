function buildNarrative(context) {
  const narrative = [];

  if (context.dreamCoach) {
    const dc = context.dreamCoach;
    const status = (dc.overallStatus || '').toLowerCase();
    const evolutions = dc.evolution || [];

    if (status === 'bom' || status === 'positivo') {
      narrative.push({
        summary: 'Usuário apresenta evolução positiva na saúde onírica',
        confidence: 80,
        category: 'sonhos',
        importance: 7,
      });
    } else if (status === 'atenção' || status === 'declínio' || status === 'negativo') {
      narrative.push({
        summary: 'Sinais de alerta na qualidade dos sonhos detectados',
        confidence: 75,
        category: 'sonhos',
        importance: 8,
      });
    }

    if (evolutions.length >= 2) {
      const last = evolutions[evolutions.length - 1];
      if (last && last.toLowerCase().includes('melhor')) {
        narrative.push({
          summary: 'Melhora consistente registrada nos padrões oníricos',
          confidence: 65,
          category: 'sonhos',
          importance: 6,
        });
      }
    }
  }

  if (context.lifeInsights) {
    const li = context.lifeInsights;

    if (li.strengths && li.strengths.length > 0) {
      const top = li.strengths.slice(0, 2).join(' e ');
      narrative.push({
        summary: `Consolidação de pontos fortes: ${top}`,
        confidence: 70,
        category: 'comportamento',
        importance: 6,
      });
    }

    if (li.attentionPoints && li.attentionPoints.length > 0) {
      const top = li.attentionPoints.slice(0, 2).join(' e ');
      narrative.push({
        summary: `Atenção necessária em: ${top}`,
        confidence: 75,
        category: 'comportamento',
        importance: 7,
      });
    }

    if (li.habits && li.habits.length > 0) {
      const top = li.habits.slice(0, 2).join(' e ');
      narrative.push({
        summary: `Consolidação de hábitos saudáveis: ${top}`,
        confidence: 70,
        category: 'hábitos',
        importance: 6,
      });
    }
  }

  if (context.activeGoals && context.activeGoals.length > 0) {
    const highProgress = context.activeGoals.filter(g => (g.progress || 0) >= 70);
    const lowProgress = context.activeGoals.filter(g => (g.progress || 0) <= 30);

    if (highProgress.length > 0) {
      for (const g of highProgress.slice(0, 2)) {
        narrative.push({
          summary: `Progresso significativo no objetivo: ${g.title}`,
          confidence: 80,
          category: 'objetivos',
          importance: 8,
        });
      }
    }

    if (context.activeGoals.some(g => g.importance === 'high' && (g.progress || 0) >= 50)) {
      narrative.push({
        summary: 'Foco principal do usuário está em objetivos prioritários em andamento',
        confidence: 75,
        category: 'objetivos',
        importance: 8,
      });
    }

    if (lowProgress.length > 0) {
      narrative.push({
        summary: `Objetivos com baixo progresso indicam possível estagnação`,
        confidence: 60,
        category: 'objetivos',
        importance: 6,
      });
    }
  }

  if (context.completedGoals && context.completedGoals.length > 0) {
    narrative.push({
      summary: `Usuário concluiu ${context.completedGoals.length} objetivo(s) recentemente`,
      confidence: 90,
      category: 'conquistas',
      importance: 9,
    });
  }

  if (context.timeline && context.timeline.length > 0) {
    const milestones = context.timeline.filter(e => e.importance >= 7);
    if (milestones.length > 0) {
      for (const m of milestones.slice(0, 2)) {
        narrative.push({
          summary: `Marco importante registrado: ${m.title}`,
          confidence: 85,
          category: 'eventos',
          importance: 8,
        });
      }
    }

    const emotional = context.timeline.filter(e => (e.category || '').toLowerCase() === 'emocional' || e.type === 'emocional');
    if (emotional.length >= 2) {
      narrative.push({
        summary: 'Múltiplos eventos emocionais indicam fase de intensidade afetiva',
        confidence: 65,
        category: 'emoções',
        importance: 7,
      });
    }

    const professional = context.timeline.filter(e => (e.category || '').toLowerCase() === 'profissional');
    if (professional.length >= 1) {
      narrative.push({
        summary: 'Novo ciclo profissional em desenvolvimento',
        confidence: 70,
        category: 'profissional',
        importance: 7,
      });
    }
  }

  if (context.emotionStats) {
    const es = context.emotionStats;
    if (es.predominant) {
      narrative.push({
        summary: `Emoção predominante atual: ${es.predominant}`,
        confidence: 80,
        category: 'emoções',
        importance: 7,
      });
    }

    const avg = es.averageIntensity;
    if (avg != null) {
      if (avg > 6) {
        narrative.push({
          summary: 'Intensidade emocional elevada indica fase de maior sensibilidade',
          confidence: 70,
          category: 'emoções',
          importance: 7,
        });
      } else if (avg < 3) {
        narrative.push({
          summary: 'Baixa intensidade emocional sugere fase de estabilidade',
          confidence: 65,
          category: 'emoções',
          importance: 6,
        });
      }
    }

    const trend = es.intensityTrend || {};
    const recent = trend['7d'];
    const medium = trend['30d'];
    if (recent != null && medium != null && medium > 0) {
      const change = ((recent - medium) / medium) * 100;
      if (change > 15) {
        narrative.push({
          summary: 'Aumento gradual da intensidade emocional nas últimas semanas',
          confidence: 70,
          category: 'emoções',
          importance: 8,
        });
      } else if (change < -15) {
        narrative.push({
          summary: 'Redução gradual da intensidade emocional nas últimas semanas',
          confidence: 70,
          category: 'emoções',
          importance: 8,
        });
      }
    }
  }

  if (context.sleepStats) {
    const ss = context.sleepStats;
    if (ss.avgSleepHours != null) {
      if (ss.avgSleepHours >= 7 && ss.avgSleepHours <= 9) {
        narrative.push({
          summary: 'Qualidade do sono dentro da faixa ideal',
          confidence: 75,
          category: 'sono',
          importance: 7,
        });
      } else if (ss.avgSleepHours < 6) {
        narrative.push({
          summary: 'Déficit de sono recorrente detectado',
          confidence: 80,
          category: 'sono',
          importance: 9,
        });
      }
    }
  }

  if (context.proactiveInsights && context.proactiveInsights.length > 0) {
    const highPrio = context.proactiveInsights.filter(i => i.priority === 'high' || i.priority === 'critical');
    if (highPrio.length > 0) {
      for (const ins of highPrio.slice(0, 2)) {
        narrative.push({
          summary: `Padrão identificado: ${ins.title}`,
          confidence: 75,
          category: 'padrões',
          importance: 7,
        });
      }
    }
  }

  if (context.qualitySummary && context.qualitySummary.averageConversationScore > 0) {
    const q = context.qualitySummary;
    if (q.averageConversationScore >= 70) {
      narrative.push({
        summary: 'Engajamento positivo e consistente nas conversas',
        confidence: 80,
        category: 'comportamento',
        importance: 6,
      });
    } else if (q.averageConversationScore <= 40) {
      narrative.push({
        summary: 'Baixo engajamento recente nas conversas',
        confidence: 70,
        category: 'comportamento',
        importance: 6,
      });
    }
  }

  if (context.importantRelationships && context.importantRelationships.length > 0) {
    const highWeight = context.importantRelationships.filter(r => (r.emotionalWeight || 0) >= 70);
    if (highWeight.length > 0) {
      const names = highWeight.map(r => r.name).join(', ');
      narrative.push({
        summary: `Relacionamentos com alto peso emocional: ${names}`,
        confidence: 80,
        category: 'relacionamentos',
        importance: 8,
      });
    }

    const frequent = context.importantRelationships.filter(r => (r.mentionCount || 0) >= 5);
    if (frequent.length > 0) {
      narrative.push({
        summary: 'Pessoas mencionadas frequentemente indicam rede de apoio ativa',
        confidence: 75,
        category: 'relacionamentos',
        importance: 7,
      });
    }
  }

  narrative.sort((a, b) => b.importance - a.importance);
  return narrative.slice(0, 5);
}

module.exports = { buildNarrative };
