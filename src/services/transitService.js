const Astronomy = require("astronomy-engine");

const SIGNS = [
  "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
  "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes"
];

const PLANETS = {
  sun: Astronomy.Body.Sun,
  moon: Astronomy.Body.Moon,
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
  pluto: Astronomy.Body.Pluto
};

const ASPECTS = [
  { name: "Conjunção", angle: 0, orb: 8, symbol: "☌" },
  { name: "Sextil", angle: 60, orb: 6, symbol: "∠" },
  { name: "Quadratura", angle: 90, orb: 7, symbol: "□" },
  { name: "Trígono", angle: 120, orb: 7, symbol: "△" },
  { name: "Oposição", angle: 180, orb: 8, symbol: "☍" }
];

const ASPECT_ENERGY = {
  "Conjunção": { type: "fusion", intensity: "alta", description: "energia combinada" },
  "Sextil": { type: "harmony", intensity: "média", description: "oportunidade fluida" },
  "Quadratura": { type: "challenge", intensity: "média", description: "tensão criativa" },
  "Trígono": { type: "harmony", intensity: "alta", description: "fluxo natural" },
  "Oposição": { type: "tension", intensity: "alta", description: "integração necessária" }
};

const PLANET_KEYWORDS = {
  sun: { keywords: ["vitalidade", "identidade", "vontade"], emoji: "☀️" },
  moon: { keywords: ["emoções", "intuição", "necessidades"], emoji: "🌙" },
  mercury: { keywords: ["comunicação", "razão", "movimento"], emoji: "☿" },
  venus: { keywords: ["amor", "beleza", "valores"], emoji: "♀️" },
  mars: { keywords: ["ação", "energia", "impulso"], emoji: "♂️" },
  jupiter: { keywords: ["expansão", "sorte", "crescimento"], emoji: "♃" },
  saturn: { keywords: ["disciplina", "limites", "responsabilidade"], emoji: "♄" },
  uranus: { keywords: ["mudança", "inovação", "liberdade"], emoji: "♅" },
  neptune: { keywords: ["sonhos", "intuição", "espiritualidade"], emoji: "♆" },
  pluto: { keywords: ["transformação", "poder", "renovação"], emoji: "♇" }
};

function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

function getSignAndDegree(longitude) {
  const normalized = normalizeDeg(longitude);
  const signIndex = Math.floor(normalized / 30);
  const degInSign = normalized % 30;
  return {
    sign: SIGNS[signIndex],
    degree: Math.floor(degInSign),
    fullDegree: normalized
  };
}

function equatorialToEclipticLon(ra, dec, oblDeg) {
  const raRad = ra * 15 * (Math.PI / 180);
  const decRad = dec * (Math.PI / 180);
  const oblRad = oblDeg * (Math.PI / 180);

  const sinLon = Math.sin(raRad) * Math.cos(oblRad) + Math.tan(decRad) * Math.sin(oblRad);
  const cosLon = Math.cos(raRad);

  return normalizeDeg(Math.atan2(sinLon, cosLon) * (180 / Math.PI));
}

function getEclipticLongitude(body, time, observer) {
  try {
    if (body === Astronomy.Body.Moon) {
      const moon = Astronomy.EclipticGeoMoon(time);
      return normalizeDeg(moon.lon);
    }

    if (body === Astronomy.Body.Sun) {
      const sun = Astronomy.SunPosition(time);
      return normalizeDeg(sun.elon);
    }

    const equ = Astronomy.Equator(body, time, observer, true, true);
    const obl = Astronomy.e_tilt(time).mobl;
    return equatorialToEclipticLon(equ.ra, equ.dec, obl);
  } catch (e) {
    console.error(`Erro ao calcular longitude eclíptica de ${body}:`, e);
    return 0;
  }
}

function isPlanetRetrograde(body, time, observer) {
  const msPerDay = 86_400_000;
  const timePrev = Astronomy.MakeTime(new Date(time.date.getTime() - msPerDay));
  const lonNow = getEclipticLongitude(body, time, observer);
  const lonPrev = getEclipticLongitude(body, timePrev, observer);

  let diff = lonNow - lonPrev;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return diff < 0;
}

function calculatePlanetPosition(body, time, observer) {
  const longitude = getEclipticLongitude(body, time, observer);
  const isRetrograde = body !== Astronomy.Body.Sun && body !== Astronomy.Body.Moon
    ? isPlanetRetrograde(body, time, observer)
    : false;

  return {
    ...getSignAndDegree(longitude),
    retrograde: isRetrograde
  };
}

function calculateTransits(currentDate, latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error("Coordenadas geográficas inválidas");
  }

  const time = Astronomy.MakeTime(new Date(currentDate));
  const observer = new Astronomy.Observer(lat, lon, 0);

  const transitPlanets = {};

  for (const [name, body] of Object.entries(PLANETS)) {
    try {
      const position = calculatePlanetPosition(body, time, observer);
      transitPlanets[name] = {
        sign: position.sign,
        degree: position.degree,
        fullDegree: position.fullDegree,
        retrograde: position.retrograde
      };
    } catch (e) {
      console.error(`Erro ao calcular trânsito de ${name}:`, e);
      transitPlanets[name] = {
        sign: "Desconhecido",
        degree: 0,
        fullDegree: 0,
        retrograde: false
      };
    }
  }

  return transitPlanets;
}

function calculateTransitAspects(transitPlanets, natalPlanets) {
  const aspects = [];
  const transitNames = Object.keys(transitPlanets);
  const natalNames = Object.keys(natalPlanets);

  for (const transitName of transitNames) {
    if (!PLANETS[transitName]) continue;

    const transitPlanet = transitPlanets[transitName];
    const transitDegree = transitPlanet.fullDegree;

    for (const natalName of natalNames) {
      if (!PLANETS[natalName]) continue;

      const natalPlanet = natalPlanets[natalName];
      const natalDegree = natalPlanet.fullDegree;

      let diff = Math.abs(transitDegree - natalDegree);
      if (diff > 180) diff = 360 - diff;

      for (const aspect of ASPECTS) {
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= aspect.orb) {
          const energy = ASPECT_ENERGY[aspect.name];
          aspects.push({
            transitPlanet: transitName,
            natalPlanet: natalName,
            aspect: aspect.name,
            symbol: aspect.symbol,
            angle: aspect.angle,
            orb: Math.round(orb * 10) / 10,
            energy: energy,
            transitSign: transitPlanet.sign,
            natalSign: natalPlanet.sign
          });
          break;
        }
      }
    }
  }

  aspects.sort((a, b) => a.orb - b.orb);

  return aspects;
}

function analyzeAspectImpact(aspect) {
  const { transitPlanet, natalPlanet, aspect: aspectName, energy } = aspect;

  const planetKeywords = PLANET_KEYWORDS[transitPlanet] || { keywords: [], emoji: "" };
  const natalKeywords = PLANET_KEYWORDS[natalPlanet] || { keywords: [], emoji: "" };

  return {
    transitPlanet: transitPlanet,
    natalPlanet: natalPlanet,
    aspectType: energy.type,
    intensity: energy.intensity,
    description: `${planetKeywords.emoji} ${transitPlanet} em ${aspectName} com ${natalPlanet} ${natalKeywords.emoji}`
  };
}

function generateDailyPrediction(aspects, userId = null) {
  if (!aspects || aspects.length === 0) {
    return ["Hoje os trânsitos não formam aspectos significativos com seu mapa natal."];
  }

  const predictions = [];
  const processedImpacts = aspects.map(aspect => analyzeAspectImpact(aspect));

  const aspectsByType = {
    challenge: processedImpacts.filter(a => a.aspectType === "challenge"),
    harmony: processedImpacts.filter(a => a.aspectType === "harmony"),
    fusion: processedImpacts.filter(a => a.aspectType === "fusion"),
    tension: processedImpacts.filter(a => a.aspectType === "tension")
  };

  if (aspectsByType.challenge.length > 0) {
    const challenge = aspectsByType.challenge[0];
    predictions.push(generateChallengePrediction(challenge));
  }

  if (aspectsByType.harmony.length > 0) {
    const harmony = aspectsByType.harmony[0];
    predictions.push(generateHarmonyPrediction(harmony));
  }

  if (aspectsByType.tension.length > 0) {
    const tension = aspectsByType.tension[0];
    predictions.push(generateTensionPrediction(tension));
  }

  if (aspectsByType.fusion.length > 0) {
    const fusion = aspectsByType.fusion[0];
    predictions.push(generateFusionPrediction(fusion));
  }

  const moonAspect = aspects.find(a => a.transitPlanet === "moon");
  if (moonAspect) {
    predictions.push(generateMoonPrediction(moonAspect));
  }

  return predictions.slice(0, 5);
}

function generateChallengePrediction(impact) {
  const templates = {
    sun: "Esta fase pode trazer desafios que testarão sua força interior. Encare com coragem.",
    moon: "Suas emoções podem estar à flor da pele. Pratique paciência consigo mesma.",
    mercury: "Comunicações importantes podem gerar atritos. Escolha suas palavras com cuidado.",
    venus: "Relações podem passar por testes. Mantenha a diplomacia.",
    mars: "Impulsos podem trazer consequências. Pense antes de agir.",
    jupiter: "Um obstáculo pode levar a oportunidades maiores. Não desanime.",
    saturn: "Restrições temporárias podem ser necessárias. Aceite os limites.",
    uranus: "Mudanças inesperadas podem ser disruptivas. Adapte-se com flexibilidade.",
    neptune: "Confusões podem surgir. Confie em sua intuição, mas verifique os fatos.",
    pluto: "Transformações profundas estão em curso. Abrace a mudança."
  };

  return templates[impact.transitPlanet] || 
    `Período de tensão entre ${impact.transitPlanet} e ${impact.natalPlanet}. seja paciente e persistente.`;
}

function generateHarmonyPrediction(impact) {
  const templates = {
    sun: "Bom momento para brilhar e mostrar seu potencial. A energia favorece realizações.",
    moon: "Suas emoções estão em harmonia.Aproveite para conectar-se com quem ama.",
    mercury: "Comunicação fluida. Bom momento para estudar e aprender algo novo.",
    venus: "Relacionamentos fluem naturalmente. Bom para atividades sociais e criativas.",
    mars: "Energia produtiva. Bom momento para ação e iniciativa.",
    jupiter: "Sorte e expansão favorecem seus planos. Boa fase para novos projetos.",
    saturn: " Trabalho bem estruturado traz resultados concretos. Continue firme.",
    uranus: "Inspirações criativas surgem naturalmente. Explore novas ideias.",
    neptune: "Intuição elevada. Bom momento para atividades artísticas e espirituais.",
    pluto: "Poder pessoal em destaque. Bom momento para autoconhecimento."
  };

  return templates[impact.transitPlanet] ||
    `Período harmonioso para ${impact.transitPlanet}. aproveite as oportunidades.`;
}

function generateTensionPrediction(impact) {
  const templates = {
    sun: "Conflitos entre sua vontade e o mundo externo podem surgir. Busque equilíbrio.",
    moon: "Tensões emocionais podem desafiá-lo. Pratique auto-compaixão.",
    mercury: "Desacordos em discussões são prováveis. Evite confrontos desnecessários.",
    venus: "Relações podem necesitar de ajustes. Comunicação aberta é fundamental.",
    mars: "Conflitos podem surgir. Use energia de forma construtiva."
  };

  return templates[impact.transitPlanet] ||
    `Fase de integração entre ${impact.transitPlanet} e ${impact.natalPlanet}. Procure o meio-termo.`;
}

function generateFusionPrediction(impact) {
  return `${capitalizeFirst(impact.transitPlanet)} está destacando ${impact.natalPlanet}. Novo ciclo se inicia nest area.`;
}

function generateMoonPrediction(moonAspect) {
  const signPredictions = {
    "Áries": "Energia emocional intensa e impulsiva. Cuide para não agir com pressa.",
    "Touro": "Necessidade de conforto e estabilidade emocional. Cuide de si.",
    "Gêmeos": "Mente ativa e comunicativa. Expresse seus sentimentos.",
    "Câncer": "Sensibilidade elevada. Conexão com a família traz paz.",
    "Leão": "Desejo de reconhecimento emocional. Busque equilíbrio entre dar e receber.",
    "Virgem": "Análise emocional detalhada. Cuidado com críticas a si mesmo.",
    "Libra": "Necessidade de harmonia nas relações. Evite indecisões.",
    "Escorpião": "Intensidade emocional profunda. Transforme o que não serve mais.",
    "Sagitário": "Busca por significado emocional. Explore sua espiritualidade.",
    "Capricórnio": "Controle emocional necessário. Estrutura traz segurança.",
    "Aquário": "Necessidade de independência emocional. Valorize suas singularidades.",
    "Peixes": "Intuição elevada. Conecte-se com seu mundo interior."
  };

  const sign = moonAspect.transitSign || "Áries";
  return signPredictions[sign] || "Dia propício para auto-reflexão emocional.";
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateWeeklyPrediction(natalPlanets, latitude, longitude, options = {}) {
  const { endDate = new Date() } = options;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const dailyAspects = [];
  const currentDate = new Date(startDate);

  for (let i = 0; i < 7; i++) {
    const transits = calculateTransits(currentDate, latitude, longitude);
    const aspects = calculateTransitAspects(transits, natalPlanets);
    dailyAspects.push({
      date: new Date(currentDate),
      aspects: aspects
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const allAspects = dailyAspects.flatMap(d => d.aspects);

  const aspectCounts = {};
  allAspects.forEach(aspect => {
    const key = `${aspect.transitPlanet}-${aspect.natalPlanet}-${aspect.aspect}`;
    aspectCounts[key] = (aspectCounts[key] || 0) + 1;
  });

  const repeatedAspects = Object.entries(aspectCounts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  const themes = {
    personal: [],
    relational: [],
    professional: [],
    emotional: []
  };

  const planetThemes = {
    sun: "personal",
    moon: "emotional",
    mercury: "relational",
    venus: "relational",
    mars: "professional",
    jupiter: "personal",
    saturn: "professional",
    uranus: "personal",
    neptune: "emotional",
    pluto: "personal"
  };

  allAspects.forEach(aspect => {
    const theme = planetThemes[aspect.transitPlanet];
    if (theme) themes[theme].push(aspect);
  });

  const predictions = [];

  if (repeatedAspects.length > 0) {
    const mainRepeated = repeatedAspects[0];
    const [tp, np, asp] = mainRepeated[0].split("-");
    predictions.push(`Esta semana ${tp} continua em ${asp} com ${np}, mantendo ${mainRepeated[1]} dias de influência.`);
  }

  if (themes.emotional.length > 0) {
    const moonAspects = themes.emotional.filter(a => a.transitPlanet === "moon");
    if (moonAspects.length >= 2) {
      predictions.push("Foco em questões emocionais e necessidades internas nesta semana.");
    }
  }

  if (themes.personal.length > 2) {
    predictions.push("Semana propícia para desenvolvimento pessoal e novoscomeços.");
  }

  if (themes.professional.length > 0) {
    predictions.push("O trabalho e responsabilidades exigem atenção redobrada.");
  }

  if (themes.relational.length > 1) {
    predictions.push("Relações sociais e comunicação estão em destaque.");
  }

  if (predictions.length === 0) {
    predictions.push("Semana de transição com energias equilibradas. Bom momento para planejamento.");
  }

  return {
    period: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0]
    },
    summary: predictions.join(" "),
    dailyBreakdown: dailyAspects.map(d => ({
      date: d.date.toISOString().split("T")[0],
      aspectCount: d.aspects.length,
      mainAspects: d.aspects.slice(0, 2).map(a => `${a.transitPlanet} ${a.aspect} ${a.natalPlanet}`)
    }))
  };
}

class PredictionManager {
  constructor() {
    this.predictions = new Map();
  }

  savePrediction(userId, chartId, prediction) {
    const key = `${userId}-${chartId}`;
    if (!this.predictions.has(key)) {
      this.predictions.set(key, []);
    }
    this.predictions.get(key).push({
      ...prediction,
      savedAt: new Date()
    });
  }

  getPredictions(userId, chartId) {
    const key = `${userId}-${chartId}`;
    return this.predictions.get(key) || [];
  }

  clearOldPredictions(daysOld = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    for (const [key, predictions] of this.predictions) {
      const filtered = predictions.filter(p => p.savedAt > cutoff);
      this.predictions.set(key, filtered);
    }
  }
}

const predictionManager = new PredictionManager();

function prepareTransitResponse(transits, aspects, predictions, chartId) {
  return {
    chartId,
    date: new Date().toISOString().split("T")[0],
    calculatedAt: new Date().toISOString(),
    transits,
    aspects,
    prediction: predictions,
    metadata: {
      transitCount: Object.keys(transits).length,
      aspectCount: aspects.length,
      predictionCount: predictions.length
    },
    _links: {
      self: `/api/astral-charts/${chartId}/transits`,
      weekly: `/api/astral-charts/${chartId}/transits/weekly`,
      natal: `/api/astral-charts/${chartId}`
    }
  };
}

module.exports = {
  calculateTransits,
  calculateTransitAspects,
  generateDailyPrediction,
  generateWeeklyPrediction,
  predictionManager,
  prepareTransitResponse,
  PLANETS,
  SIGNS,
  ASPECTS
};