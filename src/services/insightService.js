const Dream = require('../models/Dream');
const Emotion = require('../models/EmotionJournal');

const POSITIVE_EMOTIONS = ['alegria', 'calma', 'amor', 'gratidao', 'esperanca'];

function getWeekRange(date) {
  const end = new Date(date);
  const start = new Date(date);
  start.setDate(start.getDate() - 7);
  return { start, end };
}

function getMonthRange(date) {
  const end = new Date(date);
  const start = new Date(date);
  start.setDate(start.getDate() - 30);
  return { start, end };
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function avg(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function mode(arr) {
  if (arr.length === 0) return null;
  const freq = {};
  let maxFreq = 0;
  let modeVal = null;
  for (const v of arr) {
    freq[v] = (freq[v] || 0) + 1;
    if (freq[v] > maxFreq) {
      maxFreq = freq[v];
      modeVal = v;
    }
  }
  return modeVal;
}

exports.generateIntelligence = async (userId) => {
  const now = new Date();
  const monthRange = getMonthRange(now);
  const weekRange = getWeekRange(now);

  const [monthDreams, monthEmotions, weekDreams, weekEmotions] = await Promise.all([
    Dream.find({ userId, createdAt: { $gte: monthRange.start, $lte: monthRange.end } })
      .select('textoSonho dreamCategory sono createdAt interpretacao padroes')
      .lean(),
    Emotion.find({ userId, createdAt: { $gte: monthRange.start, $lte: monthRange.end } })
      .select('emotion intensity createdAt')
      .lean(),
    Dream.find({ userId, createdAt: { $gte: weekRange.start, $lte: weekRange.end } })
      .select('textoSonho dreamCategory sono createdAt')
      .lean(),
    Emotion.find({ userId, createdAt: { $gte: weekRange.start, $lte: weekRange.end } })
      .select('emotion intensity createdAt')
      .lean(),
  ]);

  const totalDreams = monthDreams.length;
  const totalEmotions = monthEmotions.length;
  const emptyData = totalDreams === 0 && totalEmotions === 0;

  // ── Dream categories ─────────────────────────────────────────
  const catCount = {};
  for (const d of monthDreams) {
    const cat = d.dreamCategory || 'Outros';
    catCount[cat] = (catCount[cat] || 0) + 1;
  }
  const catEntries = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
  const topCategory = catEntries.length > 0 ? catEntries[0][0] : null;

  // ── Emotion distribution ─────────────────────────────────────
  const emoCount = {};
  for (const e of monthEmotions) {
    emoCount[e.emotion] = (emoCount[e.emotion] || 0) + 1;
  }
  const emoEntries = Object.entries(emoCount).sort((a, b) => b[1] - a[1]);
  const topEmotion = emoEntries.length > 0 ? emoEntries[0][0] : null;
  const positiveCount = monthEmotions.filter(e => POSITIVE_EMOTIONS.includes(e.emotion)).length;
  const positivePct = totalEmotions > 0 ? Math.round((positiveCount / totalEmotions) * 100) : 0;

  // ── Sleep data ───────────────────────────────────────────────
  const sleepHours = monthDreams
    .filter(d => d.sono && d.sono.duracaoHoras)
    .map(d => d.sono.duracaoHoras);
  const avgSleep = sleepHours.length > 0 ? avg(sleepHours) : null;
  const minSleep = sleepHours.length > 0 ? Math.min(...sleepHours) : null;
  const maxSleep = sleepHours.length > 0 ? Math.max(...sleepHours) : null;

  // ── Intensity data ───────────────────────────────────────────
  const intensities = monthEmotions.map(e => e.intensity);
  const avgIntensity = intensities.length > 0 ? avg(intensities) : 0;

  // ── Weekly comparison ────────────────────────────────────────
  const weekDreamCount = weekDreams.length;
  const weekEmotionCount = weekEmotions.length;
  const prevWeekStart = new Date(weekRange.start);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekDreams = await Dream.countDocuments({
    userId,
    createdAt: { $gte: prevWeekStart, $lt: weekRange.start },
  });
  const prevWeekEmotions = await Emotion.countDocuments({
    userId,
    createdAt: { $gte: prevWeekStart, $lt: weekRange.start },
  });

  // ── Patterns ─────────────────────────────────────────────────
  const patterns = [];

  if (topCategory) {
    patterns.push(`Categoria de sonho mais frequente: ${topCategory} (${catCount[topCategory]} sonhos)`);
  }

  if (topEmotion) {
    patterns.push(`Emoção mais registrada: ${capitalize(topEmotion)} (${emoCount[topEmotion]} vezes)`);
  }

  if (totalDreams > 0 && totalEmotions > 0) {
    patterns.push(`${totalDreams} sonhos e ${totalEmotions} emoções registrados nos últimos 30 dias`);
  }

  if (avgSleep !== null) {
    const sleepLabel = avgSleep >= 7 ? 'regular' : 'abaixo do ideal';
    patterns.push(`Média de sono: ${avgSleep.toFixed(1)}h (${sleepLabel})`);
  }

  if (totalEmotions > 0) {
    const moodLabel = positivePct >= 50 ? 'predominantemente positiva' : 'predominantemente negativa';
    patterns.push(`Média de intensidade emocional: ${avgIntensity.toFixed(1)}/10`);
    patterns.push(`Composição emocional ${moodLabel} (${positivePct}% positivas)`);
  }

  // ── Insights ─────────────────────────────────────────────────
  const summary = emptyData
    ? 'Você ainda não possui dados suficientes para gerar insights inteligentes.'
    : `Nos últimos 30 dias, você registrou ${totalDreams} ${totalDreams === 1 ? 'sonho' : 'sonhos'} e ${totalEmotions} ${totalEmotions === 1 ? 'emoção' : 'emoções'}. ${topCategory ? `A categoria mais recorrente nos seus sonhos foi "${topCategory}".` : ''} ${topEmotion ? `A emoção mais frequente foi "${capitalize(topEmotion)}".` : ''}`;

  const weeklyInsight = emptyData
    ? 'Nenhum registro nesta semana.'
    : `Esta semana: ${weekDreamCount} ${weekDreamCount === 1 ? 'sonho' : 'sonhos'} e ${weekEmotionCount} ${weekEmotionCount === 1 ? 'emoção' : 'emoções'}. `
    + (weekDreamCount > prevWeekDreams
      ? `Seus registros de sonhos aumentaram em relação à semana anterior. `
      : weekDreamCount < prevWeekDreams
        ? `Você registrou menos sonhos esta semana. `
        : `A quantidade de sonhos se manteve estável. `)
    + (weekEmotionCount > prevWeekEmotions
      ? `O registro de emoções também aumentou.`
      : weekEmotionCount < prevWeekEmotions
        ? `O registro de emoções diminuiu.`
        : `O registro de emoções se manteve estável.`);

  const sleepInsight = emptyData || avgSleep === null
    ? 'Nenhum dado de sono disponível. Registre o horário de dormir e acordar ao criar um sonho.'
    : `Sua média de sono nos últimos 30 dias foi de ${avgSleep.toFixed(1)} horas por noite `
    + `(variação de ${minSleep.toFixed(1)}h a ${maxSleep.toFixed(1)}h). `
    + (avgSleep < 6
      ? 'Você tem dormido menos de 6 horas, o que pode afetar sua saúde e qualidade dos sonhos.'
      : avgSleep < 7
        ? 'Sua média está entre 6 e 7 horas. Tente dormir um pouco mais para atingir as 8 horas ideais.'
        : avgSleep < 9
          ? 'Você está mantendo uma boa rotina de sono. Continue assim!'
          : 'Você tem dormido bastante. Monitore se isso está relacionado ao seu bem-estar.');

  const emotionalInsight = emptyData
    ? 'Nenhum dado emocional disponível. Registre suas emoções para receber insights.'
    : `Sua emoção predominante foi "${capitalize(topEmotion)}" com intensidade média de ${avgIntensity.toFixed(1)}/10. `
    + (positivePct >= 70
      ? 'Seu estado emocional tem sido majoritariamente positivo. Ótimo sinal!'
      : positivePct >= 50
        ? 'Suas emoções têm sido equilibradas, com leve tendência positiva.'
        : positivePct >= 30
          ? 'Suas emoções têm uma tendência mais negativa. Considere práticas de autocuidado.'
          : 'Seu estado emocional precisa de atenção. Busque atividades que tragam bem-estar.')
    + (avgIntensity > 7
      ? ' Suas emoções têm sido muito intensas. Práticas de mindfulness podem ajudar.'
      : avgIntensity > 4
        ? ' Sua intensidade emocional está moderada.'
        : ' Sua intensidade emocional está leve e equilibrada.');

  const dreamInsight = emptyData
    ? 'Nenhum sonho registrado ainda.'
    : `Você registrou ${totalDreams} ${totalDreams === 1 ? 'sonho' : 'sonhos'} nos últimos 30 dias. `
    + (topCategory
      ? `A categoria mais comum foi "${topCategory}". `
      : '')
    + (totalDreams > 0 && topCategory
      ? getDreamCategoryMeaning(topCategory)
      : '')
    + (catEntries.length > 1
      ? `Outras categorias: ${catEntries.slice(1, 4).map(([c]) => c).join(', ')}${catEntries.length > 4 ? ' e outras' : ''}.`
      : '');

  // ── Recommendations ──────────────────────────────────────────
  const recommendations = [];

  if (totalDreams === 0) {
    recommendations.push('Registre seu primeiro sonho para começar a receber insights personalizados.');
  } else if (totalDreams < 5) {
    recommendations.push('Tente registrar mais sonhos para identificar padrões mais significativos.');
  } else {
    recommendations.push('Continue registrando seus sonhos regularmente para acompanhar a evolução dos padrões.');
  }

  if (totalEmotions === 0) {
    recommendations.push('Registre suas emoções diariamente para entender melhor seu estado emocional.');
  } else if (totalEmotions < 5) {
    recommendations.push('Quanto mais emoções você registrar, mais precisos serão os insights.');
  } else {
    recommendations.push('Mantenha o hábito de registrar emoções para monitorar seu bem-estar.');
  }

  if (avgSleep !== null && avgSleep < 6) {
    recommendations.push('Tente estabelecer uma rotina noturna para melhorar a qualidade do sono.');
  }

  if (positivePct < 30 && totalEmotions >= 3) {
    recommendations.push('Experimente atividades que promovam bem-estar: meditação, exercícios ou hobbies.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue mantendo seus registros para receber recomendações mais precisas.');
  }

  return {
    summary,
    patterns,
    recommendations,
    weeklyInsight,
    sleepInsight,
    emotionalInsight,
    dreamInsight,
    generatedAt: now.toISOString(),
  };
};

function getDreamCategoryMeaning(category) {
  const meanings = {
    Perseguição: 'Sonhos de perseguição podem refletir ansiedades ou situações de pressão no seu dia a dia.',
    Queda: 'Sonhos de queda geralmente estão ligados a sensações de perda de controle ou insegurança.',
    Água: 'Sonhos com água costumam representar o estado emocional e o inconsciente.',
    Família: 'Sonhos com família refletem suas relações e dinâmicas familiares.',
    Trabalho: 'Sonhos com trabalho podem indicar estresse profissional ou ambições.',
    Morte: 'Sonhos com morte simbolizam transformação e renovação, não necessariamente algo negativo.',
    Dinheiro: 'Sonhos com dinheiro podem estar relacionados a segurança, autoestima ou preocupações financeiras.',
    Viagem: 'Sonhos com viagem representam desejo de mudança, exploração ou escapismo.',
    Relacionamento: 'Sonhos com relacionamento refletem sua vida afetiva e conexões emocionais.',
    Outros: 'Sonhos variados indicam uma mente criativa e aberta a diferentes experiências.',
  };
  return meanings[category] || '';
}
