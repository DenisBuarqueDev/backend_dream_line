const AstralChart = require('../models/AstralChart');
const User = require('../models/User');
const astrologyService = require('../services/astrologyService');

const PLAN_CHART_LIMITS = {
  free:    1,
  premium: Infinity,
  pro:     Infinity
};

// ─── Gerar mapa astral ────────────────────────────────────────────────────────

const generateAstralChart = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, birthDate, birthTime, location } = req.body;

    // Validações
    if (!birthDate || !birthTime || !location) {
      return res.status(400).json({ error: 'Dados de nascimento incompletos.' });
    }

    if (
      !location.city ||
      !location.country ||
      location.latitude  === undefined ||
      location.longitude === undefined
    ) {
      return res.status(400).json({ error: 'Localização incompleta.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const chartLimit     = PLAN_CHART_LIMITS[user.plan] ?? 1;
    const existingCharts = await AstralChart.countDocuments({ userId });

    if (existingCharts >= chartLimit && user.plan === 'free') {
      return res.status(403).json({
        error:           'Limite de mapas atingido. Faça upgrade para Premium ou Pro para gerar mais mapas.',
        upgradeRequired: true,
        currentPlan:     user.plan
      });
    }

    // Cálculo
    const chartData = astrologyService.calculateAstralChart(
      birthDate,
      birthTime,
      location.latitude,
      location.longitude,
      location.timezone || 'UTC'
    );

    // Interpretação restrita para plano free
    const interpretation =
      user.plan !== 'free'
        ? chartData.interpretation
        : {
            sun:        `Sol em ${chartData.sunSign} — faça upgrade para ver a interpretação completa.`,
            moon:       `Lua em ${chartData.moonSign} — faça upgrade para ver a interpretação completa.`,
            ascendant:  `Ascendente em ${chartData.ascendant} — faça upgrade para ver a interpretação completa.`
          };

    const astralChart = new AstralChart({
      userId,
      name: name?.trim() || 'Mapa Astral',
      birthData: {
        date: new Date(birthDate),
        time: birthTime,
        location: {
          city:      location.city,
          country:   location.country,
          latitude:  location.latitude,
          longitude: location.longitude,
          timezone:  location.timezone || 'UTC'
        }
      },
      sunSign:       chartData.sunSign,
      moonSign:      chartData.moonSign,
      ascendant:     chartData.ascendant,
      planets:       chartData.planets,
      houses:        chartData.houses,
      aspects:       chartData.aspects,
      interpretation
    });

    await astralChart.save();

    return res.status(201).json({
      _id:           astralChart._id,
      name:          astralChart.name,
      birthData:     astralChart.birthData,
      sunSign:       astralChart.sunSign,
      moonSign:      astralChart.moonSign,
      ascendant:     astralChart.ascendant,
      planets:       astralChart.planets,
      houses:        astralChart.houses,
      aspects:       astralChart.aspects,
      interpretation:astralChart.interpretation,
      createdAt:     astralChart.createdAt
    });

  } catch (error) {
    console.error('Erro ao gerar mapa astral:', error);
    return res.status(500).json({ error: 'Erro interno ao gerar mapa astral.' });
  }
};

// ─── Listar mapas do usuário ──────────────────────────────────────────────────

const getAstralCharts = async (req, res) => {
  try {
    const charts = await AstralChart.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select('-interpretation');

    return res.json({ charts });
  } catch (error) {
    console.error('Erro ao buscar mapas astrais:', error);
    return res.status(500).json({ error: 'Erro ao buscar mapas astrais.' });
  }
};

// ─── Buscar mapa por ID ───────────────────────────────────────────────────────

const getAstralChartById = async (req, res) => {
  try {
    const chart = await AstralChart.findOne({ _id: req.params.id, userId: req.userId });

    if (!chart) {
      return res.status(404).json({ error: 'Mapa astral não encontrado.' });
    }

    return res.json(chart);
  } catch (error) {
    console.error('Erro ao buscar mapa astral:', error);
    return res.status(500).json({ error: 'Erro ao buscar mapa astral.' });
  }
};

// ─── Deletar mapa ─────────────────────────────────────────────────────────────

const deleteAstralChart = async (req, res) => {
  try {
    const chart = await AstralChart.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!chart) {
      return res.status(404).json({ error: 'Mapa astral não encontrado.' });
    }

    return res.json({ message: 'Mapa astral deletado com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar mapa astral:', error);
    return res.status(500).json({ error: 'Erro ao deletar mapa astral.' });
  }
};

module.exports = {
  generateAstralChart,
  getAstralCharts,
  getAstralChartById,
  deleteAstralChart
};
