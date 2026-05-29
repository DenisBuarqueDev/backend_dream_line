const Astronomy = require("astronomy-engine");

const SIGNS = [
  "Áries",
  "Touro",
  "Gêmeos",
  "Câncer",
  "Leão",
  "Virgem",
  "Libra",
  "Escorpião",
  "Sagitário",
  "Capricórnio",
  "Aquário",
  "Peixes",
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
  pluto: Astronomy.Body.Pluto,
};

const ASPECTS = [
  { name: "Conjunção", angle: 0, orb: 8 },
  { name: "Sextil", angle: 60, orb: 6 },
  { name: "Quadratura", angle: 90, orb: 7 },
  { name: "Trígono", angle: 120, orb: 7 },
  { name: "Oposição", angle: 180, orb: 8 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    fullDegree: normalized,
  };
}

// ─── Ecliptic longitude via astronomy-engine ─────────────────────────────────
//
// astronomy-engine v2 não aceita o objeto EquatorialCoordinates diretamente em
// Ecliptic(). A conversão segura é feita manualmente via fórmula esférica
// padrão usando a obliquidade da eclíptica.
//
// Rotas por corpo:
//   Lua  → EclipticGeoMoon(time).lon   (dedicado, mais preciso)
//   Sol  → SunPosition(time).elon      (retorna longitude geocêntrica diretamente)
//   Resto→ Equator() + conversão manual RA/Dec → λ eclíptica

function equatorialToEclipticLon(ra, dec, oblDeg) {
  // ra em horas → graus, dec em graus, obl em graus
  const raRad = ra * 15 * (Math.PI / 180);
  const decRad = dec * (Math.PI / 180);
  const oblRad = oblDeg * (Math.PI / 180);

  const sinLon =
    Math.sin(raRad) * Math.cos(oblRad) + Math.tan(decRad) * Math.sin(oblRad);
  const cosLon = Math.cos(raRad);

  return normalizeDeg(Math.atan2(sinLon, cosLon) * (180 / Math.PI));
}

function getEclipticLongitude(body, time, observer) {
  try {
    // Lua — método dedicado
    if (body === Astronomy.Body.Moon) {
      const moon = Astronomy.EclipticGeoMoon(time);
      return normalizeDeg(moon.lon);
    }

    // Sol — longitude geocêntrica direta
    if (body === Astronomy.Body.Sun) {
      const sun = Astronomy.SunPosition(time);
      return normalizeDeg(sun.elon);
    }

    // Demais planetas: coordenadas equatoriais geocêntricas → eclíptica manual
    const equ = Astronomy.Equator(body, time, observer, true, true);
    const obl = Astronomy.e_tilt(time).mobl; // obliquidade média (graus)
    return equatorialToEclipticLon(equ.ra, equ.dec, obl);
  } catch (e) {
    console.error(`Erro ao calcular longitude eclíptica de ${body}:`, e);
    return 0;
  }
}

function isPlanetRetrograde(body, time, observer) {
  // Compara a longitude de hoje com a de ontem
  const msPerDay = 86_400_000;
  const timePrev = Astronomy.MakeTime(new Date(time.date.getTime() - msPerDay));
  const lonNow = getEclipticLongitude(body, time, observer);
  const lonPrev = getEclipticLongitude(body, timePrev, observer);

  // Lida com a passagem pelo 0°/360°
  let diff = lonNow - lonPrev;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return diff < 0;
}

function calculatePlanetPosition(body, time, observer) {
  const longitude = getEclipticLongitude(body, time, observer);
  const isRetrograde =
    body !== Astronomy.Body.Sun && body !== Astronomy.Body.Moon
      ? isPlanetRetrograde(body, time, observer)
      : false;

  return {
    ...getSignAndDegree(longitude),
    retrograde: isRetrograde,
  };
}

// ─── Ascendente ───────────────────────────────────────────────────────────────
//
// Fórmula padrão para o Ascendente:
//   ASC = atan2(cos(RAMC), -(sin(RAMC)·cos(ε) + tan(φ)·sin(ε)))
// onde RAMC = Tempo Sidéreo Local × 15 (graus), ε = obliquidade, φ = latitude.

function calculateAscendant(time, latitude) {
  const obliquity = Astronomy.e_tilt(time).mobl; // obliquidade média em graus
  const gst = Astronomy.SiderealTime(time); // GST em horas
  const ramc = normalizeDeg(gst * 15); // RAMC em graus

  const latRad = latitude * (Math.PI / 180);
  const oblRad = obliquity * (Math.PI / 180);
  const ramcRad = ramc * (Math.PI / 180);

  // Fórmula padrão do Ascendente
  const ascRad = Math.atan2(
    Math.cos(ramcRad),
    -(
      Math.sin(ramcRad) * Math.cos(oblRad) +
      Math.tan(latRad) * Math.sin(oblRad)
    ),
  );

  let asc = normalizeDeg(ascRad * (180 / Math.PI));

  return getSignAndDegree(asc);
}

// ─── Casas (sistema Placidus simplificado / Equal House) ─────────────────────

function calculateHouses(time, latitude, longitude) {
  const obliquity = Astronomy.e_tilt(time).mobl;
  const gst = Astronomy.SiderealTime(time); // GST em horas
  const lst = normalizeDeg((gst + longitude / 15) * 15); // LST em graus

  // MC = RAMC + 90° (Meio-do-Céu)
  const mc = normalizeDeg(lst + 90);

  // Ascendente
  const asc = calculateAscendant(time, latitude).fullDegree;

  // Sistema Equal House: casas de 30° a partir do Ascendente
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const cusp = normalizeDeg(asc + i * 30);
    houses.push({
      house: i + 1,
      ...getSignAndDegree(cusp),
    });
  }

  return houses;
}

function findHouse(degree, houses) {
  for (let i = 0; i < 12; i++) {
    const current = houses[i].fullDegree;
    const next = houses[(i + 1) % 12].fullDegree;

    if (next > current) {
      if (degree >= current && degree < next) return i + 1;
    } else {
      // Passa pelo 0°
      if (degree >= current || degree < next) return i + 1;
    }
  }
  return 1;
}

// ─── Aspectos ─────────────────────────────────────────────────────────────────

function calculateAspects(planets) {
  const aspects = [];
  const planetNames = Object.keys(planets);

  for (let i = 0; i < planetNames.length; i++) {
    for (let j = i + 1; j < planetNames.length; j++) {
      const p1 = planetNames[i];
      const p2 = planetNames[j];
      const lon1 = planets[p1].fullDegree;
      const lon2 = planets[p2].fullDegree;

      let diff = Math.abs(lon1 - lon2);
      if (diff > 180) diff = 360 - diff;

      for (const aspect of ASPECTS) {
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= aspect.orb) {
          aspects.push({
            planet1: p1,
            planet2: p2,
            aspect: aspect.name,
            angle: aspect.angle, // ângulo nominal (0, 60, 90, 120, 180) — obrigatório no schema
            orb: Math.round(orb * 10) / 10,
          });
          break; // evita registrar dois aspectos para o mesmo par
        }
      }
    }
  }

  return aspects;
}

// ─── Interpretações básicas ────────────────────────────────────────────────────

const SUN_INTERP = {
  Áries:
    "Você possui uma energia vital intensa, marcada por iniciativa, coragem e desejo de liderança. Gosta de agir rapidamente e enfrentar desafios de frente, sendo movido por impulsos e entusiasmo. Pode se destacar como pioneiro, mas precisa desenvolver paciência e constância para sustentar seus projetos ao longo do tempo.",
  Touro:
    "Sua essência busca estabilidade, segurança e prazer nos aspectos concretos da vida. Você valoriza conforto, beleza e consistência, sendo alguém persistente e confiável. Pode resistir a mudanças, mas sua força está na capacidade de construir algo sólido e duradouro com calma e determinação.",
  Gêmeos:
    "Você é movido pela curiosidade e pela necessidade de comunicação. Sua mente é rápida, adaptável e versátil, sempre em busca de novos conhecimentos e experiências. Pode se dispersar facilmente, mas sua habilidade de aprender e conectar ideias é uma de suas maiores forças.",
  Câncer:
    "Sua identidade está profundamente ligada às emoções, à família e ao sentimento de pertencimento. Você é intuitivo, protetor e sensível, valorizando vínculos afetivos. Pode oscilar emocionalmente, mas possui grande capacidade de cuidado e conexão genuína com os outros.",
  Leão: "Você possui uma presença marcante, criativa e confiante. Gosta de se expressar, brilhar e ser reconhecido por quem é. Tem um coração generoso e uma forte necessidade de se sentir especial. O desafio é equilibrar orgulho e humildade.",
  Virgem:
    "Você é guiado pelo desejo de aperfeiçoamento, organização e utilidade. Analítico e detalhista, busca eficiência em tudo que faz. Pode ser crítico consigo e com os outros, mas sua maior qualidade é a capacidade de melhorar sistemas e ajudar de forma prática.",
  Libra:
    "Você busca harmonia, equilíbrio e justiça em todas as áreas da vida. Valoriza relacionamentos, estética e diplomacia. Tem facilidade em ver diferentes pontos de vista, mas pode ter dificuldade em tomar decisões firmes.",
  Escorpião:
    "Sua essência é intensa, profunda e transformadora. Você vive tudo com paixão e busca compreender o que está oculto. Tem grande poder de regeneração, mas precisa lidar com controle e emoções extremas.",
  Sagitário:
    "Você é guiado pela busca de significado, expansão e liberdade. Aventureiro e otimista, gosta de explorar o mundo e aprender com experiências. Pode ser impulsivo, mas inspira os outros com sua visão e entusiasmo.",
  Capricórnio:
    "Você é focado, disciplinado e orientado para objetivos. Valoriza responsabilidade, estrutura e conquistas a longo prazo. Pode parecer reservado, mas possui grande força para construir uma vida sólida.",
  Aquário:
    "Você é inovador, independente e voltado para o coletivo. Gosta de pensar diferente e quebrar padrões. Valoriza liberdade e ideias originais, mas pode se desconectar emocionalmente em alguns momentos.",
  Peixes:
    "Você é sensível, intuitivo e profundamente conectado ao mundo emocional e espiritual. Tem grande empatia e imaginação. Pode se perder em ilusões, mas possui um dom natural para arte, compaixão e cura.",
};

const MOON_INTERP = {
  Áries:
    "Você reage emocionalmente de forma rápida e intensa. Seus sentimentos surgem com força e você tende a agir impulsivamente. Precisa aprender a canalizar essa energia emocional de forma equilibrada.",
  Touro:
    "Você busca estabilidade emocional e conforto. Precisa de segurança e rotina para se sentir bem. É leal e constante nos sentimentos, mas pode resistir a mudanças emocionais.",
  Gêmeos:
    "Você precisa expressar suas emoções através da comunicação. Falar, escrever ou trocar ideias ajuda a organizar seus sentimentos. Pode oscilar emocionalmente com frequência.",
  Câncer:
    "Você possui uma natureza emocional profunda e intuitiva. Precisa de vínculos afetivos fortes e segurança emocional. É altamente sensível ao ambiente e às pessoas ao redor.",
  Leão: "Você busca reconhecimento emocional e gosta de se sentir valorizado. Expressa sentimentos de forma calorosa e dramática. Precisa de atenção e afeto para se sentir seguro.",
  Virgem:
    "Você processa emoções de forma racional. Gosta de ajudar e cuidar dos outros como forma de equilíbrio emocional. Pode reprimir sentimentos ao tentar analisá-los demais.",
  Libra:
    "Você precisa de harmonia emocional, especialmente nos relacionamentos. Evita conflitos e busca equilíbrio, mas pode depender demais da aprovação dos outros.",
  Escorpião:
    "Suas emoções são intensas, profundas e transformadoras. Você sente tudo com muita força e pode ter dificuldade em confiar. Grande capacidade de regeneração emocional.",
  Sagitário:
    "Você precisa de liberdade emocional e espaço para crescer. É otimista e busca significado nos sentimentos. Pode evitar emoções mais densas.",
  Capricórnio:
    "Você tende a controlar e estruturar suas emoções. Pode parecer frio, mas sente profundamente. Precisa aprender a se abrir mais emocionalmente.",
  Aquário:
    "Você lida com emoções de forma mais racional e desapegada. Valoriza liberdade emocional e conexão intelectual. Pode ter dificuldade em expressar sentimentos profundos.",
  Peixes:
    "Você é extremamente sensível e empático. Absorve emoções do ambiente facilmente. Possui grande imaginação e conexão espiritual, mas precisa de limites emocionais.",
};

const ASC_INTERP = {
  Áries:
    "Você se apresenta como alguém direto, energético e cheio de iniciativa. Passa uma imagem de coragem e independência, sendo visto como líder natural.",
  Touro:
    "Sua presença transmite estabilidade, calma e segurança. As pessoas te veem como confiável, paciente e alguém que valoriza o conforto e a estética.",
  Gêmeos:
    "Você se mostra comunicativo, curioso e adaptável. Passa uma imagem leve e sociável, com facilidade para interagir e aprender rapidamente.",
  Câncer:
    "Você aparenta ser sensível, acolhedor e protetor. Sua energia transmite cuidado e empatia, fazendo com que os outros se sintam confortáveis ao seu lado.",
  Leão: "Você tem uma presença forte, carismática e marcante. Chama atenção naturalmente e transmite confiança e criatividade.",
  Virgem:
    "Você se apresenta de forma discreta, organizada e eficiente. Passa uma imagem de competência e atenção aos detalhes.",
  Libra:
    "Sua imagem é harmoniosa, elegante e agradável. Você transmite diplomacia e facilidade em lidar com pessoas.",
  Escorpião:
    "Você possui uma presença intensa, misteriosa e magnética. As pessoas te percebem como profundo e enigmático.",
  Sagitário:
    "Você se apresenta como alguém otimista, espontâneo e aventureiro. Transmite entusiasmo e amor pela liberdade.",
  Capricórnio:
    "Sua imagem é séria, responsável e focada. Você transmite autoridade, disciplina e respeito.",
  Aquário:
    "Você se mostra original, independente e diferente. Passa uma imagem inovadora e fora do padrão.",
  Peixes:
    "Você transmite sensibilidade, leveza e empatia. Sua presença é suave, intuitiva e muitas vezes artística.",
};

function generateInterpretation(planets, ascendant) {
  const sunSign = planets.sun.sign;
  const moonSign = planets.moon.sign;
  const ascSign = ascendant.sign;

  return {
    sun: `Sol em ${sunSign} — ${SUN_INTERP[sunSign] || "Representa sua essência e vitalidade."}`,
    moon: `Lua em ${moonSign} — ${MOON_INTERP[moonSign] || "Representa suas emoções e necessidade emocional."}`,
    ascendant: `Ascendente em ${ascSign} — ${ASC_INTERP[ascSign] || "Representa sua aparência e como você se apresenta ao mundo."}`,
  };
}

// ─── Exportação principal ─────────────────────────────────────────────────────

function calculateAstralChart(
  birthDate,
  birthTime,
  latitude,
  longitude,
  timezone,
) {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hours, minutes] = birthTime.split(":").map(Number);

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error("Coordenadas geográficas inválidas");
  }

  // Cria Date como horário local (sem ajuste UTC para manter fidelidade ao lugar de nascimento)
  const localDate = new Date(year, month - 1, day, hours, minutes, 0);
  const time = Astronomy.MakeTime(localDate);
  const observer = new Astronomy.Observer(lat, lon, 0);

  // Calcula posições dos planetas
  const planetMap = {};
  for (const [name, body] of Object.entries(PLANETS)) {
    try {
      planetMap[name] = calculatePlanetPosition(body, time, observer);
    } catch (e) {
      console.error(`Erro ao calcular ${name}:`, e);
      planetMap[name] = {
        sign: "Desconhecido",
        degree: 0,
        fullDegree: 0,
        retrograde: false,
      };
    }
  }

  const ascendant = calculateAscendant(time, lat);
  const houses = calculateHouses(time, lat, lon);
  const aspects = calculateAspects(planetMap);
  const interpretation = generateInterpretation(planetMap, ascendant);

  const planetPositions = Object.entries(planetMap).map(([planet, pos]) => ({
    planet,
    sign: pos.sign,
    degree: pos.degree,
    fullDegree: pos.fullDegree,
    house: findHouse(pos.fullDegree, houses),
    retrograde: pos.retrograde,
  }));

  return {
    sunSign: planetMap.sun.sign,
    moonSign: planetMap.moon.sign,
    ascendant: ascendant.sign,
    planets: planetPositions,
    houses,
    aspects,
    interpretation,
  };
}

module.exports = { calculateAstralChart };
