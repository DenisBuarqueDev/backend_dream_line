const User = require('../models/User');
const UserMemory = require('../models/UserMemory');
const GoalTracking = require('../models/GoalTracking');
const CompanionJourney = require('../models/CompanionJourney');
const DailyCompanion = require('../models/DailyCompanion');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse } = require('../utils/response');

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MORNING_CATALOG = [
  'Bom dia',
  'Que bom ver você',
  'Que seu dia comece bem',
  'Mais um dia',
  'Que a paz te acompanhe hoje',
  'Bora começar o dia',
  'Um novo amanhecer',
  'Que seu dia seja leve',
  'Obrigado por estar aqui',
  'Que a luz te guie hoje',
];

const AFTERNOON_CATALOG = [
  'Boa tarde',
  'Que sua tarde seja produtiva',
  'Espero que seu dia esteja indo bem',
  'Força para essa tarde',
  'Respira fundo',
];

const NIGHT_CATALOG = [
  'Boa noite',
  'Que sua noite seja tranquila',
  'Hora de descansar',
  'Respira e relaxa',
  'Obrigado pelo dia de hoje',
];

function dayIndex() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const oneDay = 86400000;
  return Math.floor(diff / oneDay);
}

function buildGreeting(name) {
  const hour = new Date().getHours();
  const idx = dayIndex();

  let catalog, period;
  if (hour >= 5 && hour < 12) {
    catalog = MORNING_CATALOG;
    period = 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    catalog = AFTERNOON_CATALOG;
    period = 'Boa tarde';
  } else {
    catalog = NIGHT_CATALOG;
    period = 'Boa noite';
  }

  const message = catalog[idx % catalog.length];
  return name ? `${message}, ${name.split(' ')[0]}.` : `${message}.`;
}

const JOURNEY_LABELS = {
  ansiedade: 'ansiedade',
  sono: 'sono',
  rotina: 'rotina',
  produtividade: 'produtividade',
  espiritualidade: 'espiritualidade',
  autoestima: 'autoestima',
  habitos: 'hábitos',
  relacionamentos: 'relacionamentos',
};

exports.getHome = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const [user, memory, homeMsg, goals, journeys] = await Promise.all([
    User.findById(userId).select('name email').lean(),
    UserMemory.findOne({ userId }).lean(),
    DailyCompanion.findOne({ userId, date: todayStr() }).lean(),
    GoalTracking.find({ userId, status: 'active' }).sort({ importance: -1, progress: -1 }).limit(1).lean(),
    CompanionJourney.find({ userId, status: 'active' }).sort({ importance: -1 }).limit(1).lean(),
  ]);

  const greeting = buildGreeting(user?.name || user?.email?.split('@')[0]);

  const homeCompanion = homeMsg
    ? {
        available: true,
        title: homeMsg.title,
        message: homeMsg.message,
        category: homeMsg.category,
        priority: homeMsg.priority,
        viewed: homeMsg.viewed,
        generatedAt: homeMsg.generatedAt,
      }
    : { available: false, message: null };

  const quickSummary = {
    dreamScore: memory?.profile?.dreamScore?.score ?? null,
    dreamScoreLabel: memory?.profile?.dreamScore?.label ?? null,
    predominantMood: memory?.emotions?.predominantEmotion ?? null,
    consistency: memory?.behavior?.consistencyScore ?? null,
    totalDreams: memory?.stats?.totalDreams ?? 0,
    activeDays: memory?.stats?.activeDays ?? 0,
    currentJourney: journeys.length > 0
      ? {
          category: journeys[0].category,
          label: JOURNEY_LABELS[journeys[0].category] || journeys[0].category,
          progress: journeys[0].progress,
          stage: journeys[0].currentStage,
        }
      : null,
    mainGoal: goals.length > 0
      ? {
          title: goals[0].title,
          progress: goals[0].progress,
          category: goals[0].category,
        }
      : null,
  };

  let nextStep = null;
  if (goals.length > 0) {
    nextStep = {
      text: `Seu objetivo "${goals[0].title}" está com ${goals[0].progress}% de progresso. Continue assim!`,
      type: 'goal',
      relatedTo: goals[0].category,
    };
  } else if (journeys.length > 0) {
    const label = JOURNEY_LABELS[journeys[0].category] || journeys[0].category;
    nextStep = {
      text: `Sua jornada de ${label} continua evoluindo.`,
      type: 'journey',
      relatedTo: journeys[0].category,
    };
  } else if (!memory?.stats?.totalDreams || memory.stats.totalDreams === 0) {
    nextStep = {
      text: 'Que tal registrar seu primeiro sonho hoje?',
      type: 'first_dream',
      relatedTo: null,
    };
  } else {
    nextStep = {
      text: 'Continue cuidando de você. Pequenos passos fazem a diferença.',
      type: 'general',
      relatedTo: null,
    };
  }

  const quickActions = [
    { label: 'Registrar Sonho', icon: 'moon', route: 'CreateDream', priority: 1 },
    { label: 'Registrar Emoção', icon: 'heart', route: 'CreateEmotion', priority: 2 },
    { label: 'Conversar', icon: 'chatbubble', route: 'Chat', priority: 3 },
    { label: 'Diário dos Sonhos', icon: 'book', route: 'DreamTimeline', priority: 4 },
    { label: 'Calendário', icon: 'calendar', route: 'Calendar', priority: 5 },
    { label: 'Perfil', icon: 'person', route: 'Profile', priority: 6 },
  ];

  const currentJourney = journeys.length > 0
    ? {
        title: journeys[0].title,
        category: journeys[0].category,
        progress: journeys[0].progress,
        stage: journeys[0].currentStage,
        importance: journeys[0].importance,
      }
    : null;

  successResponse(res, {
    greeting,
    homeCompanion,
    currentJourney,
    quickSummary,
    nextStep,
    quickActions,
  });
});
