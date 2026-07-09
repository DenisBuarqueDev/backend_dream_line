const QUESTION_TYPES = {
  OBJECTIVE: 'objective',
  EMOTIONAL: 'emotional',
  DREAM: 'dream',
  PERSONAL: 'personal',
  EVOLUTION: 'evolution',
  GENERAL: 'general',
};

function classifyQuestion(question) {
  const q = question.toLowerCase().trim();

  const objectivePatterns = [
    /quantas? horas? (eu )?durmo/i,
    /qual (a )?minha média (de )?sono/i,
    /quantos sonhos (eu )?tive/i,
    /qual (o )?meu (score|status)/i,
    /quantas? vezes/i,
    /estatísticas?/i,
    /dados? (do )?(meu )?(sono|sonho)/i,
    /média (de )?(sono|emoção)/i,
    /o que significa (sonhar|ter)/i,
  ];
  for (const p of objectivePatterns) {
    if (p.test(q)) return QUESTION_TYPES.OBJECTIVE;
  }

  const emotionalPatterns = [
    /ansios[ao]/i,
    /estressado/i,
    /triste/i,
    /feliz/i,
    /emocionalmente/i,
    /sentind[oae]/i,
    /emoç[ãa]o/i,
    /humor/i,
    /deprimid[ao]/i,
    /angustiado/i,
    /irritad[ao]/i,
    /calm[oa]/i,
    /preocupad[ao]/i,
    /medo/i,
    /raiva/i,
    /estou me (sentindo|sinto)/i,
  ];
  for (const p of emotionalPatterns) {
    if (p.test(q)) return QUESTION_TYPES.EMOTIONAL;
  }

  const dreamPatterns = [
    /sonhei/i,
    /sonh[oa]/i,
    /sonhar/i,
    /pesadelo/i,
    /interpreta[çc][ãa]o/i,
    /s[ií]mbolo/i,
    /categoria.*sonh/i,
    /padr[ãa]o.*sonh/i,
    /sonhos.*recorrente/i,
  ];
  for (const p of dreamPatterns) {
    if (p.test(q)) return QUESTION_TYPES.DREAM;
  }

  const personalPatterns = [
    /voc[êe] (sabe|lembra|conhece)/i,
    /lembra (que|da)/i,
    /(eu )?(j[aá]|ja) (te|lhe) (contei|falei|disse)/i,
    /voc[êe] lembra/i,
    /n[ãa]o sei se voc[êe] sabe/i,
  ];
  for (const p of personalPatterns) {
    if (p.test(q)) return QUESTION_TYPES.PERSONAL;
  }

  const evolutionPatterns = [
    /evolu[çc][ãa]o/i,
    /evoluind[oa]/i,
    /melhorei/i,
    /piorei/i,
    /estou melhor/i,
    /estou pior/i,
    /mud[oa]u/i,
    /progresso/i,
    /melhor[oa]ndo/i,
    /pior[oa]ndo/i,
    /como (eu )?estou/i,
    /o que mudou/i,
    /diferen[çc]a/i,
  ];
  for (const p of evolutionPatterns) {
    if (p.test(q)) return QUESTION_TYPES.EVOLUTION;
  }

  return QUESTION_TYPES.GENERAL;
}

function selectContext(question, fullContext) {
  const type = classifyQuestion(question);
  const selected = { ...fullContext };

  function limitFacts() {
    if (selected.longTermMemory && selected.longTermMemory.length > 2) {
      selected.longTermMemory = selected.longTermMemory.slice(0, 2);
    }
  }

  function limitTimeline() {
    if (selected.timeline && selected.timeline.length > 3) {
      selected.timeline = selected.timeline.slice(0, 3);
    }
  }

  function limitLifeInsights() {
    if (selected.lifeInsights) {
      if (selected.lifeInsights.strengths && selected.lifeInsights.strengths.length > 2) {
        selected.lifeInsights.strengths = selected.lifeInsights.strengths.slice(0, 2);
      }
      if (selected.lifeInsights.attentionPoints && selected.lifeInsights.attentionPoints.length > 2) {
        selected.lifeInsights.attentionPoints = selected.lifeInsights.attentionPoints.slice(0, 2);
      }
    }
  }

  function limitDreams() {
    if (selected.recentDreams && selected.recentDreams.length > 2) {
      selected.recentDreams = selected.recentDreams.slice(0, 2);
    }
  }

  function limitEmotions() {
    if (selected.recentEmotions && selected.recentEmotions.length > 2) {
      selected.recentEmotions = selected.recentEmotions.slice(0, 2);
    }
  }

  function limitRecommendations() {
    if (selected.recommendations && selected.recommendations.length > 2) {
      selected.recommendations = selected.recommendations.slice(0, 2);
    }
  }

  function applyAllLimits() {
    limitFacts();
    limitTimeline();
    limitLifeInsights();
    limitDreams();
    limitEmotions();
    limitRecommendations();
  }

  switch (type) {
    case QUESTION_TYPES.OBJECTIVE:
      selected.dreamCoach = null;
      selected.lifeInsights = null;
      selected.timeline = [];
      selected.longTermMemory = [];
      selected.recentDreams = [];
      selected.recentEmotions = [];
      break;

    case QUESTION_TYPES.EMOTIONAL:
      selected.dreamCoach = selected.dreamCoach ? { ...selected.dreamCoach, evolution: [], positives: [], concerns: [] } : null;
      selected.timeline = [];
      selected.longTermMemory = [];
      selected.recentDreams = [];
      break;

    case QUESTION_TYPES.DREAM:
      selected.dreamCoach = null;
      selected.lifeInsights = null;
      selected.timeline = [];
      break;

    case QUESTION_TYPES.PERSONAL:
      selected.dreamCoach = null;
      selected.lifeInsights = null;
      selected.timeline = [];
      selected.recentDreams = [];
      selected.recentEmotions = [];
      break;

    case QUESTION_TYPES.EVOLUTION:
      selected.recentDreams = [];
      selected.recentEmotions = [];
      selected.longTermMemory = [];
      break;

    case QUESTION_TYPES.GENERAL:
    default:
      break;
  }

  if (selected.recentDreams && selected.recentDreams.length === 0) {
    selected.recentDreams = [];
  }
  if (selected.recentEmotions && selected.recentEmotions.length === 0) {
    selected.recentEmotions = [];
  }

  applyAllLimits();

  return selected;
}

module.exports = { selectContext };
