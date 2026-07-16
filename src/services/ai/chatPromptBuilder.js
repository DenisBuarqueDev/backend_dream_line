function buildCognitiveText(cognitiveContext) {
  if (!cognitiveContext) return '';
  let block = '## CONTEXTO COGNITIVO\n\n';

  if (cognitiveContext.personalContext) {
    const pc = cognitiveContext.personalContext;
    block += 'Perfil do usuário:\n';
    if (pc.profile) block += `- Tipo onírico: ${pc.profile.type}\n`;
    if (pc.dreamScore) block += `- Dream Score: ${pc.dreamScore.score || pc.dreamScore}\n`;
    if (pc.stats) block += `- Total de sonhos: ${pc.stats.totalDreams || 0}\n`;
    if (pc.sleepStats && pc.sleepStats.avgSleepHours) block += `- Média de sono: ${pc.sleepStats.avgSleepHours}h\n`;
    if (pc.emotionStats && pc.emotionStats.predominant) block += `- Emoção predominante: ${pc.emotionStats.predominant}\n`;
    if (pc.dreamStats && pc.dreamStats.mostFrequentCategory) block += `- Categoria mais frequente: ${pc.dreamStats.mostFrequentCategory}\n`;
    block += '\n';
  }

  if (cognitiveContext.activeMemories && cognitiveContext.activeMemories.length > 0) {
    block += 'Memórias sobre o usuário:\n';
    for (const m of cognitiveContext.activeMemories) {
      block += `- [${m.category}] ${m.fact}\n`;
    }
    block += '\n';
  }

  if (cognitiveContext.activeInsights && cognitiveContext.activeInsights.length > 0) {
    block += 'Insights recentes:\n';
    for (const i of cognitiveContext.activeInsights) {
      block += `- ${i.title}${i.description ? ': ' + i.description : ''}\n`;
    }
    block += '\n';
  }

  if (cognitiveContext.activeTimeline && cognitiveContext.activeTimeline.length > 0) {
    block += 'Eventos recentes:\n';
    for (const e of cognitiveContext.activeTimeline) {
      const dateStr = e.date ? (typeof e.date === 'string' ? e.date.split('T')[0] : '') : '';
      block += `- ${dateStr ? dateStr + ' - ' : ''}${e.title || e.type}\n`;
    }
    block += '\n';
  }

  if (cognitiveContext.activePatterns && Object.keys(cognitiveContext.activePatterns).length > 0) {
    const p = cognitiveContext.activePatterns;
    block += 'Padrões identificados:\n';
    if (p.categories && p.categories.length > 0) {
      block += `- Categorias predominantes: ${p.categories.map(c => c.category || c).join(', ')}\n`;
    }
    if (p.symbols && p.symbols.length > 0) {
      block += `- Símbolos recorrentes: ${p.symbols.join(', ')}\n`;
    }
    if (p.tags && p.tags.length > 0) {
      block += `- Tags frequentes: ${p.tags.join(', ')}\n`;
    }
    if (p.correlations && p.correlations.length > 0) {
      block += '- Correlações detectadas entre sonhos e emoções\n';
    }
    if (p.dreamCoach) {
      block += `- Status atual: ${p.dreamCoach.overallStatus || 'neutro'}\n`;
      if (p.dreamCoach.evolution && p.dreamCoach.evolution.length > 0) {
        block += `- Evolução: ${p.dreamCoach.evolution.join('; ')}\n`;
      }
    }
    if (p.lifeInsights) {
      const li = p.lifeInsights;
      if (li.strengths && li.strengths.length > 0) block += `- Pontos fortes: ${li.strengths.join(', ')}\n`;
      if (li.habits && li.habits.length > 0) block += `- Hábitos: ${li.habits.join(', ')}\n`;
    }
    block += '\n';
  }

  if (cognitiveContext.activeRecommendations && cognitiveContext.activeRecommendations.length > 0) {
    block += 'Recomendações:\n';
    for (const r of cognitiveContext.activeRecommendations) {
      block += `- ${r.title || r}\n`;
    }
    block += '\n';
  }

  if (cognitiveContext.activeWarnings && cognitiveContext.activeWarnings.length > 0) {
    block += 'Alertas:\n';
    for (const w of cognitiveContext.activeWarnings) {
      block += `- ${typeof w === 'string' ? w : w.title || w}\n`;
    }
    block += '\n';
  }

  if (cognitiveContext.conversationContext) {
    const cc = cognitiveContext.conversationContext;
    block += 'Plano:\n';
    block += `- Foco: ${cc.primaryTopic || 'geral'}${cc.secondaryTopic ? ' / ' + cc.secondaryTopic : ''}\n`;
    block += `- Tom: ${cc.emotionalTone || 'neutro'}\n`;
    block += `- Estilo: ${cc.answerStyle || 'médio'}\n`;
    block += '\n';
  }

  if (cognitiveContext.activeConversations && cognitiveContext.activeConversations.length > 0) {
    block += 'Conversas anteriores:\n';
    for (const c of cognitiveContext.activeConversations) {
      block += `- ${c.topic} (${c.status}): ${c.summary}\n`;
    }
    block += '\n';
  }

  if (cognitiveContext.activeGoals && cognitiveContext.activeGoals.length > 0) {
    block += 'Objetivos do usuário:\n';
    for (const g of cognitiveContext.activeGoals) {
      block += `- ${g.title} (${g.category}, ${g.progress}%)\n`;
    }
    block += '\n';
  }

  return block;
}

function buildEmotionText(state) {
  if (!state) return '';
  let block = '## ESTADO EMOCIONAL ATUAL\n\n';
  block += `Emoção detectada: ${state.detectedEmotion}\n`;
  block += `Intensidade: ${state.emotionalIntensity}\n`;
  block += `Modo de conversa: ${state.conversationMode}\n`;
  block += `Nível de empatia: ${state.empathyLevel}\n`;
  block += `Abertura recomendada: "${state.responseOpening}"\n`;
  if (state.shouldCelebrate) block += 'Celebrar: sim\n';
  if (state.shouldEncourage) block += 'Incentivar: sim\n';
  if (state.shouldAskQuestion) block += 'Convidar reflexão: sim\n';
  if (state.shouldAvoidAnalysis) block += 'Evitar análises longas: sim\n';
  if (state.shouldBeObjective) block += 'Tom objetivo: sim\n';
  block += '\nAdapte seu tom com base neste estado. Não mencione este bloco ao usuário.';
  return block;
}

function buildInitiativeText(initiative) {
  if (!initiative || !initiative.shouldSuggest || !initiative.suggestion) return '';
  let block = '## INICIATIVA CONVERSACIONAL\n\n';
  block += `Sugestão: ${initiative.suggestion}\n`;
  block += `Prioridade: ${initiative.priority}\n\n`;
  block += 'Use esta sugestão SOMENTE se fizer sentido naturalmente na conversa. NUNCA pareça robótica. NUNCA diga "segundo seu histórico", "na memória" ou "conforme os dados". A transição deve soar como uma lembrança natural sua. Se não se encaixar perfeitamente, ignore o bloco.';
  return block;
}

function buildDecisionText(decisions) {
  if (!decisions) return '';
  let block = '## DECISÃO COGNITIVA\n\n';
  block += 'Não mostrar ao usuário.\n';
  block += 'Utilizar apenas como orientação.\n';
  block += 'Ela determina quais informações são realmente relevantes para responder esta pergunta.\n\n';

  const activeDecisions = [];
  if (decisions.useUserMemory) activeDecisions.push('Perfil do usuário');
  if (decisions.useMemoryFacts) activeDecisions.push('Memórias sobre o usuário');
  if (decisions.useConversationMemory) activeDecisions.push('Conversas anteriores');
  if (decisions.useRecentDreams) activeDecisions.push('Sonhos recentes');
  if (decisions.useRecentEmotions) activeDecisions.push('Emoções recentes');
  if (decisions.useDreamCoach) activeDecisions.push('Dream Coach');
  if (decisions.useLifeInsights) activeDecisions.push('Life Insights');
  if (decisions.useTimeline) activeDecisions.push('Timeline');
  if (decisions.useProactiveInsights) activeDecisions.push('Insights proativos');

  block += `Informações relevantes: ${activeDecisions.join(', ') || 'nenhuma'}\n`;
  block += `Profundidade: ${decisions.responseDepth || 'medium'}\n`;
  block += `Tom: ${decisions.responseTone || 'supportive'}\n`;
  block += `Máximo de conexões: ${decisions.maxConnections || 0}\n`;
  if (decisions.allowInitiative) block += 'Iniciativa conversacional: permitida\n';
  if (decisions.shouldAskFollowUp) block += 'Pergunta de aprofundamento: sugerida\n';
  if (decisions.connectOldDream) block += 'Conexão com sonho antigo: permitida\n';
  block += `Motivo: ${decisions.reason || 'default'}\n\n`;
  block += 'Utilize estas decisões para filtrar e priorizar as informações no bloco CONTEXTO COGNITIVO. Informações marcadas como não relevantes devem ser ignoradas.';

  return block;
}

function buildOrchestrationText(orchestration) {
  if (!orchestration || !orchestration.modules) return '';
  let block = '## ORQUESTRAÇÃO COGNITIVA\n\n';
  block += 'Não mostrar ao usuário.\n';
  block += 'Coordenador de módulos cognitivos.\n\n';

  const activeLabels = [];
  for (const key of (orchestration.activeModules || [])) {
    const label = moduleLabel(key);
    const priority = orchestration.modules[key]?.priority || 0;
    activeLabels.push(`${label} (${priority})`);
  }
  block += `Módulos ativos: ${activeLabels.join(', ') || 'nenhum'}\n`;

  const ignoredLabels = (orchestration.ignoredModules || []).map(k => moduleLabel(k));
  if (ignoredLabels.length > 0) {
    block += `Módulos ignorados: ${ignoredLabels.join(', ')}\n`;
  }

  block += `Motivo: ${orchestration.reason || 'default'}\n\n`;
  block += 'Utilize apenas os módulos ativos para responder. Módulos ignorados não devem ser considerados.';

  return block;
}

function moduleLabel(key) {
  const labels = {
    memoryFacts: 'MemoryFacts',
    conversationMemory: 'ConversationMemory',
    dreamCoach: 'DreamCoach',
    lifeInsights: 'LifeInsights',
    timeline: 'Timeline',
    goalTracking: 'GoalTracking',
    proactiveInsights: 'ProactiveInsights',
    recentDreams: 'RecentDreams',
    recentEmotions: 'RecentEmotions',
  };
  return labels[key] || key;
}

function buildStrategyText(strategy) {
  if (!strategy) return '';
  let block = '## ESTRATÉGIA DA CONVERSA\n\n';
  block += `Estratégia: ${strategy.strategy || 'answer_only'}\n`;
  block += `Profundidade: ${strategy.depth || 'média'}\n`;
  if (strategy.shouldAskFollowUp) {
    block += `Follow-up sugerido: ${strategy.followUpType || 'curiosidade'}\n`;
  } else {
    block += 'Follow-up: não sugerido\n';
  }
  if (strategy.curiosity) block += 'Estimular curiosidade: sim\n';
  if (strategy.shouldClose) block += 'Encerramento: natural\n';
  block += '\n';
  block += 'Siga esta estratégia para conduzir a conversa. ';
  block += 'Se shouldAskFollowUp for falso, NUNCA crie perguntas extras no final. ';
  if (strategy.shouldAskFollowUp) {
    block += 'Se verdadeiro, faça APENAS UMA pergunta natural, como se fosse uma conversa real. ';
    block += 'Nunca pareça um formulário ou chatbot.';
  }
  return block;
}

function buildQualityText(quality) {
  if (!quality) return '';
  let block = '## QUALIDADE COGNITIVA\n\n';
  if (quality.averageConversationScore > 0) {
    block += `Score médio: ${quality.averageConversationScore}/100\n`;
    block += `Engajamento médio: ${quality.averageEngagement}/100\n`;
    block += `Taxa de follow-up: ${quality.averageFollowUp}%\n`;
    block += `Profundidade preferida: ${quality.preferredConversationDepth}\n`;
    block += `Nível de contexto preferido: ${quality.preferredContextLevel}\n`;
    block += `Nível de iniciativa preferido: ${quality.preferredInitiativeLevel}\n`;
    block += '\n';
    block += 'Ajuste naturalmente o estilo da conversa respeitando este histórico de qualidade observado. Não mude abruptamente.';
  } else {
    block += 'Ainda não há dados de qualidade suficientes para ajuste de estilo.\n';
    block += 'Mantenha o estilo padrão da conversa.';
  }
  block += '\n\nNão mencione qualidade ou métricas ao usuário. Use apenas internamente.';
  return block;
}

function buildPersonalityText(personality) {
  if (!personality) return '';
  let block = '## PERSONALIDADE\n\n';
  block += 'Não mostrar ao usuário.\n';
  block += 'Perfil de personalidade atual da IA:\n\n';
  block += `Calor humano: ${personality.warmth || 'Médio'}\n`;
  block += `Empatia: ${personality.empathy || 'Médio'}\n`;
  block += `Curiosidade: ${personality.curiosity || 'Médio'}\n`;
  block += `Humor: ${personality.humor || 'Médio'}\n`;
  block += `Otimismo: ${personality.optimism || 'Médio'}\n`;
  block += `Objetividade: ${personality.directness || 'Médio'}\n`;
  block += `Naturalidade: ${personality.playfulness || 'Médio'}\n`;
  block += `Reflexão: ${personality.reflectionLevel || 'Médio'}\n`;
  block += `Energia da conversa: ${personality.conversationEnergy || 'Moderada'}\n\n`;
  block += 'A personalidade deve permanecer consistente durante toda a conversa. ';
  block += 'Ela evolui lentamente ao longo do tempo. ';
  block += 'Nunca mencionar essas informações ao usuário.';
  return block;
}

function buildRelationshipText(relationships) {
  if (!relationships || relationships.length === 0) return '';
  let block = '## RELACIONAMENTOS IMPORTANTES\n\n';
  block += 'Não mostrar ao usuário.\n';
  block += 'Pessoas importantes na vida do usuário:\n\n';
  for (const r of relationships) {
    const status = r.currentStatus || '';
    const recent = r.lastMention
      ? Math.floor((Date.now() - new Date(r.lastMention).getTime()) / 86400000)
      : 999;
    let timeLabel = 'antiga';
    if (recent <= 1) timeLabel = 'muito recente';
    else if (recent <= 7) timeLabel = 'recente';
    else if (recent <= 30) timeLabel = 'há algumas semanas';
    block += `${r.name} — ${r.relationship}\n`;
    if (status) block += `  Situação: ${status}\n`;
    block += `  Última menção: ${timeLabel} (${r.mentionCount}x)\n`;
  }
  block += '\nQuando fizer sentido para a conversa, lembre naturalmente dessas pessoas. ';
  block += 'Nunca cite listas. ';
  block += 'Nunca pareça banco de dados. ';
  block += 'Nunca mencione "RelationshipMemory" ou termos internos.';
  return block;
}

function buildOptimizationText(opt) {
  if (!opt) return '';
  let block = '## OTIMIZAÇÃO FINAL\n\n';
  block += 'Não mostrar ao usuário.\n';
  block += 'Score de equilíbrio: ' + opt.optimizationScore + '/100\n';
  block += 'Tom final: ' + opt.finalTone + '\n';
  block += 'Profundidade final: ' + opt.finalDepth + '\n';
  block += 'Contexto máximo: ' + (opt.maxContextBlocks === 99 ? 'sem restrição' : opt.maxContextBlocks + ' blocos') + '\n';
  block += 'Conexões máximas: ' + (opt.shouldReduceConnections ? 'reduzir' : 'permitidas') + '\n';
  block += 'Linguagem: ' + (opt.shouldSimplifyLanguage ? 'simples' : 'natural') + '\n';
  block += 'Motivo: ' + opt.reason + '\n';
  block += '\nA resposta final deve respeitar esta otimização como última decisão cognitiva antes da geração do texto.';
  return block;
}

function buildPlanningText(plan) {
  if (!plan) return '';
  const openingLabels = { direta: 'Direta', acolhedora: 'Acolhedora', reflexiva: 'Reflexiva', celebrativa: 'Celebrativa', informativa: 'Informativa', natural: 'Natural' };
  const bodyLabels = { conversa: 'Conversa', explicativo: 'Explicativo', reflexivo: 'Reflexivo', pratico: 'Prático', emocional: 'Emocional', curto: 'Curto' };
  const closingLabels = { pergunta_aberta: 'Pergunta aberta', incentivo: 'Incentivo', reflexao: 'Reflexão', natural: 'Natural', sugestao: 'Sugestão', encerramento: 'Encerramento' };
  let block = '## PLANEJAMENTO DA RESPOSTA\n\n';
  block += 'Não mostrar ao usuário.\n';
  block += 'Abertura: ' + (openingLabels[plan.opening] || plan.opening) + '\n';
  block += 'Desenvolvimento: ' + (bodyLabels[plan.bodyStyle] || plan.bodyStyle) + '\n';
  block += 'Encerramento: ' + (closingLabels[plan.closing] || plan.closing) + '\n';
  if (plan.shouldAskQuestion) block += 'Fazer pergunta: sim\n';
  if (plan.shouldUseMemoryConnection) block += 'Usar memória: sim\n';
  if (plan.shouldUseExample) block += 'Usar exemplo: sim\n';
  if (plan.shouldUseMetaphor) block += 'Usar metáfora: sim\n';
  block += 'Tamanho: ' + plan.estimatedLength + '\n';
  block += 'Conexões máximas: ' + plan.maxConnections + '\n';
  block += '\nA IA deve seguir este planejamento naturalmente, sem mencionar qualquer estrutura interna.';
  return block;
}

function buildGoalText(goal) {
  if (!goal) return '';
  const labels = {
    tranquilizar: 'Tranquilizar',
    acolher: 'Acolher',
    incentivar: 'Incentivar',
    celebrar: 'Celebrar',
    ensinar: 'Ensinar',
    esclarecer: 'Esclarecer',
    estimular_reflexao: 'Estimular reflexão',
    estimular_autoconhecimento: 'Estimular autoconhecimento',
    sugerir_pequena_acao: 'Sugerir pequena ação',
    fortalecer_autoestima: 'Fortalecer autoestima',
    reduzir_ansiedade: 'Reduzir ansiedade',
    aumentar_confianca: 'Aumentar confiança',
    validar_sentimentos: 'Validar sentimentos',
    encerrar_naturalmente: 'Encerrar naturalmente',
    manter_conversa_aberta: 'Manter conversa aberta',
  };
  let block = '## OBJETIVO DA RESPOSTA\n\n';
  block += 'Não mostrar ao usuário.\n';
  block += 'Objetivo: ' + (labels[goal.goal] || goal.goal) + '\n';
  block += 'Prioridade: ' + goal.priority + '\n';
  block += 'Direção: ' + (goal.responseDirection || 'natural') + '\n';
  block += '\nA resposta deve buscar atingir este objetivo de maneira natural, sem mencionar objetivos internos.';
  return block;
}

function buildIntentText(intent) {
  if (!intent) return '';
  const labels = {
    objective_answer: 'Resposta objetiva',
    chat: 'Conversar',
    vent: 'Desabafar',
    advice: 'Aconselhamento',
    emotional_support: 'Apoio emocional',
    dream_interpretation: 'Interpretação de sonhos',
    reflect: 'Refletir',
    follow_up: 'Acompanhamento',
    celebrate: 'Celebrar conquista',
    decision_help: 'Ajuda para decisão',
    learn: 'Aprender',
    curious: 'Curiosidade',
  };
  let block = '## INTENÇÃO DA CONVERSA\n\n';
  block += 'Não mostrar ao usuário.\n';
  block += 'Intenção: ' + (labels[intent.intent] || intent.intent) + '\n';
  block += 'Confiança: ' + intent.confidence + '%\n';
  if (intent.urgency > 0) block += 'Urgência: ' + intent.urgency + '/10\n';
  block += '\nSiga esta intenção ao responder. ';
  block += 'Nunca pareça um robô. ';
  block += 'Nunca mencione este bloco ao usuário. ';
  block += 'Nunca mencione "Intent" ou "ConversationIntent".';
  return block;
}

function buildReasoningText(reasoning) {
  if (!reasoning) return '';
  let block = '## RACIOCÍNIO PRINCIPAL\n\n';
  block += 'Não mostrar ao usuário.\n';
  block += 'Guia para a resposta:\n\n';
  block += 'Assunto principal: ' + (reasoning.mainTopic || 'geral') + '\n';
  if (reasoning.mainConcern) block += 'Preocupação identificada: ' + reasoning.mainConcern + '\n';
  if (reasoning.mainOpportunity) block += 'Oportunidade identificada: ' + reasoning.mainOpportunity + '\n';
  block += 'Raciocínio: ' + (reasoning.reasoning && reasoning.reasoning.description) + '\n';
  block += 'Foco: ' + (reasoning.recommendedFocus || 'natural') + '\n';
  block += 'Prioridade: ' + (reasoning.priority && reasoning.priority.level) + '\n';
  if (reasoning.bestInsight) block += 'Insight prioritário: ' + reasoning.bestInsight.title + '\n';
  if (reasoning.ignoredContexts && reasoning.ignoredContexts.length > 0) {
    block += 'Ignorar: ' + reasoning.ignoredContexts.join(', ') + '\n';
  }
  block += '\nSiga este raciocínio como guia principal da resposta. ';
  block += 'Nunca mencione nomes internos. ';
  block += 'Nunca mencione serviços. ';
  block += 'Nunca mencione módulos.';
  return block;
}

function buildJourneyText(journeys) {
  if (!journeys || journeys.length === 0) return '';
  let block = '## JORNADAS ATUAIS\n\n';
  block += 'Não mostrar ao usuário.\n';
  block += 'Jornadas em andamento:\n\n';
  for (const j of journeys) {
    const daysSince = j.lastInteraction
      ? Math.floor((Date.now() - new Date(j.lastInteraction).getTime()) / 86400000)
      : '?';
    const timeLabel = daysSince <= 1 ? 'hoje' : daysSince <= 3 ? 'há ' + daysSince + ' dias' : 'há ' + daysSince + ' dias';
    block += '  ' + j.title + '\n';
    block += '    Progresso: ' + j.progress + '%\n';
    block += '    Estágio: ' + (j.currentStage || 'Em evolução') + '\n';
    block += '    Última atualização: ' + timeLabel + '\n';
  }
  block += '\nQuando existir uma jornada ativa, utilize APENAS quando realmente agregar valor. ';
  block += 'Nunca liste jornadas. ';
  block += 'Nunca mencione "Journey", "Companion", "Context" ou qualquer nome interno. ';
  block += 'Utilize no máximo uma conexão por resposta. ';
  block += 'Exemplo: "Parece que isso faz parte daquela mudança que você vem construindo nas últimas semanas."';
  return block;
}

function buildNarrativeText(narrative) {
  if (!narrative || narrative.length === 0) return '';
  let block = '## NARRATIVA CONTÍNUA\n\n';
  block += 'Não mostrar ao usuário.\n';
  block += 'Jornada do usuário:\n\n';
  for (const n of narrative) {
    block += `• ${n.summary}\n`;
  }
  block += '\nSempre que esta narrativa agregar valor, utilize-a naturalmente para conectar acontecimentos. ';
  block += 'Nunca citar: "Narrativa", "Timeline", "Memory", "Context". ';
  block += 'Nunca produzir resposta em formato de relatório. ';
  block += 'Nunca listar todos os acontecimentos. ';
  block += 'Utilizar no máximo uma conexão narrativa por resposta.';
  return block;
}

function formatHistory(history) {
  if (!history || history.length === 0) return '';
  return history
    .map((h, i) => `[${i + 1}] Usuário: ${h.question}\nAssistente: ${h.answer || ''}`)
    .join('\n\n');
}

function buildChatPrompt(question, context, history = [], plan = null, emotionalState = null, cognitiveContext = null, initiative = null, decisions = null, strategy = null) {
  const systemPrompt = `Você é o Dream AI, um assistente pessoal que acompanha o usuário há muito tempo. Age como terapeuta leve, amiga inteligente e companheira de jornada — nunca como relatório, dashboard ou sistema.

PERSONALIDADE:
- Empática e acolhedora — valide os sentimentos do usuário com naturalidade
- Analítica na medida certa — conecte informações, não as liste
- Calma e objetiva — evite alarmismo ou dramatização
- Incentivadora — promova autoconhecimento e reflexão
- Tom de conversa — pareça uma pessoa, não um diagnóstico

REGRAS GERAIS:
1. Responda APENAS com base nos dados fornecidos — NUNCA invente informações sobre o usuário
2. NUNCA mencione nomes internos: "UserMemory", "MemoryFacts", "Dream Coach", "Life Insights", "Timeline", "Proactive Insights", "Cognitive Context". O usuário nunca deve saber que esses módulos existem.
3. NUNCA liste dados de maneira mecânica — integre as informações de forma natural na conversa
4. NUNCA responda como relatório. Seu tom deve ser de conversa, não de diagnóstico.
5. Evite repetir informações que já foram ditas anteriormente na conversa
6. Se faltarem dados para responder, diga claramente que não há informações suficientes
7. NÃO utilize conhecimento externo para criar fatos sobre o usuário
8. NÃO faça diagnósticos médicos ou psicológicos
9. Limite cada resposta a no máximo 300 palavras
10. Conecte informações de diferentes partes do contexto para parecer que você simplesmente conhece o usuário
11. VOCÊ TEM UMA MEMÓRIA DE CONVERSAS ANTERIORES — no bloco "Conversas anteriores" estão assuntos discutidos antes com o usuário. Utilize apenas quando ajudar naturalmente a resposta. NUNCA force lembranças. NUNCA repita assuntos antigos sem contexto. A prioridade é: pergunta atual > histórico recente > demais blocos de contexto > conversas anteriores.
12. NUNCA mencione que está acessando "conversas anteriores", "memória de conversas", "banco de dados" ou qualquer termo técnico. Apenas use a informação como se fosse uma lembrança natural sua. Exemplo bom: "Na última vez conversamos sobre seu objetivo de melhorar a qualidade do sono. Como isso tem evoluído?" Exemplo ruim: "Conforme registrado em nosso banco de dados de conversas anteriores..."
13. VOCÊ TEM UM BLOCO DE INICIATIVA CONVERSACIONAL — ele contém sugestões de assuntos que podem ser retomados naturalmente na conversa. Use SOMENTE se fizer sentido no contexto da pergunta atual. NUNCA use se a pergunta for técnica, se for um cumprimento, ou se não houver conexão natural. A sugestão deve parecer uma lembrança sua, nunca um relatório. Máximo de UMA conexão por resposta, e ela deve ser complementar — nunca interromper o fluxo principal da resposta.
14. O BLOCO "OBJETIVOS DO USUÁRIO" contém objetivos pessoais que o usuário definiu ao longo do tempo. Utilize apenas quando ajudar naturalmente a resposta. Reconheça evolução, celebre conquistas e incentive continuidade quando fizer sentido. NUNCA liste os objetivos de forma mecânica. NUNCA pareça um relatório de progresso. Exemplo bom: "Você vem progredindo bastante no seu objetivo de melhorar o sono!" Exemplo ruim: "Seu objetivo 'Melhorar o sono' está em 60% de progresso."
15. SIGA A ESTRATÉGIA DA CONVERSA definida no bloco "ESTRATÉGIA DA CONVERSA". Se shouldAskFollowUp for falso, NUNCA crie perguntas extras no final da resposta. Se verdadeiro, faça APENAS UMA pergunta natural como follow-up. Nunca pareça um formulário ou chatbot. A estratégia define o tom, a profundidade e se deve estimular curiosidade ou encerrar naturalmente.
16. O BLOCO "QUALIDADE COGNITIVA" contém o histórico de qualidade observado nas conversas anteriores. Ajuste naturalmente o estilo da conversa respeitando este histórico — por exemplo, se a profundidade preferida for "superficial", seja mais direta; se for "profunda", explore mais. Se o nível de contexto preferido for "low", use menos conexões com dados antigos; se for "high", pode integrar mais informações de contexto. NUNCA mencione qualidade ou métricas ao usuário.
17. O BLOCO "PERSONALIDADE" contém seu perfil de personalidade atual. A personalidade deve permanecer consistente durante toda a conversa. Ela evolui lentamente ao longo do tempo baseada nas interações com o usuário. Siga o perfil definido: se o calor humano for "Alto", seja mais acolhedora; se a objetividade for "Alta", seja mais direta; se o humor for "Baixo", evite brincadeiras; se a reflexão for "Alta", incentive mais introspecção. A personalidade NUNCA deve mudar abruptamente entre respostas. NUNCA mencione essas informações ao usuário.
18. O BLOCO "RELACIONAMENTOS IMPORTANTES" contém pessoas importantes na vida do usuário. Quando fizer sentido para a conversa, lembre naturalmente dessas pessoas. NUNCA cite listas de nomes. NUNCA pareça banco de dados. NUNCA mencione "RelationshipMemory" ou termos internos. Exemplo natural: "Você comentou outras vezes sobre a Ana. Espero que ela esteja bem." Exemplo proibido: "Conforme meu registro de relacionamentos, Ana é sua esposa."
19. O BLOCO "NARRATIVA CONTÍNUA" contém a jornada do usuário identificada a partir dos dados disponíveis. Sempre que esta narrativa agregar valor, utilize-a naturalmente para conectar acontecimentos. NUNCA cite "Narrativa", "Timeline", "Memory" ou "Context". NUNCA produza resposta em formato de relatório. NUNCA liste todos os acontecimentos. Utilize no máximo uma conexão narrativa por resposta. Exemplo natural: "Percebo que essa preocupação faz parte de um momento que você já vinha enfrentando nas últimas semanas." Exemplo natural: "Isso parece continuar uma mudança que você já havia começado algum tempo atrás."
20. O BLOCO "JORNADAS ATUAIS" contém as jornadas de longo prazo do usuário (como reduzir ansiedade, melhorar sono, criar rotina). Utilize APENAS quando realmente agregar valor. NUNCA liste jornadas. NUNCA mencione "Journey", "Companion", "Context" ou qualquer nome interno. Utilize no máximo uma conexão por resposta. Exemplo natural: "Parece que isso faz parte daquela mudança que você vem construindo nas últimas semanas."
21. O BLOCO "RACIOCÍNIO PRINCIPAL" contém o raciocínio que deve guiar sua resposta. Siga este raciocínio como guia principal. NUNCA mencione nomes internos. NUNCA mencione serviços. NUNCA mencione módulos.
22. O BLOCO "INTENÇÃO DA CONVERSA" contém a intenção identificada para esta interação. Siga esta intenção ao responder. NUNCA pareça um robô. NUNCA mencione este bloco ao usuário. NUNCA mencione "Intent" ou "ConversationIntent".
23. O BLOCO "OBJETIVO DA RESPOSTA" contém o objetivo psicológico que esta resposta deve atingir. A resposta deve buscar atingir este objetivo de maneira natural, sem mencionar objetivos internos. NUNCA mencione "Goal", "ResponseGoal" ou "Objetivo da Resposta" ao usuário.
24. O BLOCO "PLANEJAMENTO DA RESPOSTA" contém a estrutura planejada para a resposta. A IA deve seguir este planejamento naturalmente, sem mencionar qualquer estrutura interna. NUNCA mencione "Planejamento", "Plan" ou "ConversationPlan".
25. O BLOCO "OTIMIZAÇÃO FINAL" contém a última decisão cognitiva antes da geração do texto. A resposta final deve respeitar esta otimização como última decisão cognitiva. NUNCA mencione "Otimização", "Optimization" ou "ResponseOptimization" ao usuário.`;

  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  if (decisions) {
    const decisionText = buildDecisionText(decisions);
    if (decisionText) {
      messages.push({
        role: 'user',
        content: decisionText,
      });
    }
  }

  if (cognitiveContext && cognitiveContext.cognitiveOrchestration) {
    const orchText = buildOrchestrationText(cognitiveContext.cognitiveOrchestration);
    if (orchText) {
      messages.push({
        role: 'user',
        content: orchText,
      });
    }
  }

  if (cognitiveContext && cognitiveContext.activeReasoning) {
    const reasonText = buildReasoningText(cognitiveContext.activeReasoning);
    if (reasonText) {
      messages.push({
        role: 'user',
        content: reasonText,
      });
    }
  }

  if (cognitiveContext && cognitiveContext.conversationIntent) {
    const intentText = buildIntentText(cognitiveContext.conversationIntent);
    if (intentText) {
      messages.push({
        role: 'user',
        content: intentText,
      });
    }
  }

  if (cognitiveContext && cognitiveContext.responseGoal) {
    const goalText = buildGoalText(cognitiveContext.responseGoal);
    if (goalText) {
      messages.push({
        role: 'user',
        content: goalText,
      });
    }
  }

  if (cognitiveContext && cognitiveContext.conversationPlan) {
    const planText = buildPlanningText(cognitiveContext.conversationPlan);
    if (planText) {
      messages.push({
        role: 'user',
        content: planText,
      });
    }
  }

  if (cognitiveContext && cognitiveContext.responseOptimization) {
    const optText = buildOptimizationText(cognitiveContext.responseOptimization);
    if (optText) {
      messages.push({
        role: 'user',
        content: optText,
      });
    }
  }

  if (strategy) {
    const strategyText = buildStrategyText(strategy);
    if (strategyText) {
      messages.push({
        role: 'user',
        content: strategyText,
      });
    }
  }

  if (cognitiveContext) {
    const qualityText = buildQualityText(cognitiveContext.activeQuality);
    if (qualityText) {
      messages.push({
        role: 'user',
        content: qualityText,
      });
    }
  }

  if (cognitiveContext) {
    const personalityText = buildPersonalityText(cognitiveContext.activePersonality);
    if (personalityText) {
      messages.push({
        role: 'user',
        content: personalityText,
      });
    }
  }

  if (cognitiveContext) {
    const relText = buildRelationshipText(cognitiveContext.activeRelationships);
    if (relText) {
      messages.push({
        role: 'user',
        content: relText,
      });
    }
  }

  if (cognitiveContext) {
    const narrText = buildNarrativeText(cognitiveContext.activeNarrative);
    if (narrText) {
      messages.push({
        role: 'user',
        content: narrText,
      });
    }
  }

  if (cognitiveContext) {
    const journeyText = buildJourneyText(cognitiveContext.activeJourneys);
    if (journeyText) {
      messages.push({
        role: 'user',
        content: journeyText,
      });
    }
  }

  if (cognitiveContext) {
    messages.push({
      role: 'user',
      content: buildCognitiveText(cognitiveContext),
    });
  }

  if (history.length > 0) {
    messages.push({
      role: 'user',
      content: `## HISTÓRICO DA CONVERSA\n\n${formatHistory(history)}\n\nEste bloco contém o histórico de perguntas e respostas anteriores. Use para manter coerência com a conversa.`,
    });
  }

  if (emotionalState) {
    messages.push({
      role: 'user',
      content: buildEmotionText(emotionalState),
    });
  }

  if (initiative) {
    const initiativeText = buildInitiativeText(initiative);
    if (initiativeText) {
      messages.push({
        role: 'user',
        content: initiativeText,
      });
    }
  }

  messages.push({
    role: 'user',
    content: `## PERGUNTA ATUAL\n\n${question}\n\n---\n\nAnalise todos os dados disponíveis e responda de forma natural. Se houver uma conexão relevante que enriqueça a resposta, adicione-a com naturalidade. Máximo de uma conexão contextual.`,
  });

  return { messages };
}

module.exports = { buildChatPrompt };
