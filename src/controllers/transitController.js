const AstralChart = require('../models/AstralChart');
const {
  calculateTransits,
  calculateTransitAspects,
  generateDailyPrediction,
  generateWeeklyPrediction,
  prepareTransitResponse,
  predictionManager
} = require('../services/transitService');

const getTransits = async (req, res) => {
  try {
    const { id: chartId } = req.params;
    const userId = req.userId;

    const chart = await AstralChart.findOne({ _id: chartId, userId });

    if (!chart) {
      return res.status(404).json({ error: 'Mapa astral não encontrado.' });
    }

    const { latitude, longitude } = chart.birthData.location;
    const currentDate = new Date();

    const transits = calculateTransits(currentDate, latitude, longitude);

    const natalPlanets = {};
    chart.planets.forEach(planet => {
      natalPlanets[planet.planet] = {
        fullDegree: planet.fullDegree,
        sign: planet.sign
      };
    });

    const aspects = calculateTransitAspects(transits, natalPlanets);

    const prediction = generateDailyPrediction(aspects, userId);

    const response = prepareTransitResponse(transits, aspects, prediction, chartId);

    return res.json(response);

  } catch (error) {
    console.error('Erro ao calcular trânsitos:', error);
    return res.status(500).json({ error: 'Erro interno ao calcular trânsitos.' });
  }
};

const getWeeklyTransits = async (req, res) => {
  try {
    const { id: chartId } = req.params;
    const userId = req.userId;
    const { days = 7 } = req.query;

    const chart = await AstralChart.findOne({ _id: chartId, userId });

    if (!chart) {
      return res.status(404).json({ error: 'Mapa astral não encontrado.' });
    }

    const { latitude, longitude } = chart.birthData.location;

    const natalPlanets = {};
    chart.planets.forEach(planet => {
      natalPlanets[planet.planet] = {
        fullDegree: planet.fullDegree,
        sign: planet.sign
      };
    });

    const endDate = new Date();
    const weeklyPrediction = generateWeeklyPrediction(
      natalPlanets,
      latitude,
      longitude,
      {
        endDate,
        days: parseInt(days)
      }
    );

    const currentTransits = calculateTransits(endDate, latitude, longitude);
    const aspects = calculateTransitAspects(currentTransits, natalPlanets);
    const dailyPredictions = generateDailyPrediction(aspects, userId);

    return res.json({
      chartId,
      period: weeklyPrediction.period,
      summary: weeklyPrediction.summary,
      dailyBreakdown: weeklyPrediction.dailyBreakdown,
      currentTransits: currentTransits,
      currentAspects: aspects,
      todayPrediction: dailyPredictions,
      _links: {
        self: `/api/astral-charts/${chartId}/transits/weekly`,
        daily: `/api/astral-charts/${chartId}/transits`,
        natal: `/api/astral-charts/${chartId}`
      }
    });

  } catch (error) {
    console.error('Erro ao calcular previsão semanal:', error);
    return res.status(500).json({ error: 'Erro interno ao calcular previsão semanal.' });
  }
};

const getTransitsForDate = async (req, res) => {
  try {
    const { id: chartId } = req.params;
    const { date } = req.query;
    const userId = req.userId;

    const chart = await AstralChart.findOne({ _id: chartId, userId });

    if (!chart) {
      return res.status(404).json({ error: 'Mapa astral não encontrado.' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Data é obrigatória (formato: YYYY-MM-DD).' });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Data inválida.' });
    }

    const { latitude, longitude } = chart.birthData.location;

    const transits = calculateTransits(targetDate, latitude, longitude);

    const natalPlanets = {};
    chart.planets.forEach(planet => {
      natalPlanets[planet.planet] = {
        fullDegree: planet.fullDegree,
        sign: planet.sign
      };
    });

    const aspects = calculateTransitAspects(transits, natalPlanets);
    const prediction = generateDailyPrediction(aspects, userId);

    return res.json({
      chartId,
      date: date,
      transits,
      aspects,
      prediction,
      _links: {
        self: `/api/astral-charts/${chartId}/transits/date?date=${date}`,
        natal: `/api/astral-charts/${chartId}`
      }
    });

  } catch (error) {
    console.error('Erro ao calcular trânsitos para data específica:', error);
    return res.status(500).json({ error: 'Erro interno ao calcular trânsitos.' });
  }
};

const savePrediction = async (req, res) => {
  try {
    const { id: chartId } = req.params;
    const userId = req.userId;

    const chart = await AstralChart.findOne({ _id: chartId, userId });

    if (!chart) {
      return res.status(404).json({ error: 'Mapa astral não encontrado.' });
    }

    const { prediction, date } = req.body;

    if (!prediction || !Array.isArray(prediction)) {
      return res.status(400).json({ error: 'Previsão inválida.' });
    }

    predictionManager.savePrediction(userId, chartId, {
      prediction,
      date: date || new Date().toISOString().split("T")[0]
    });

    return res.json({ message: 'Previsão salva com sucesso.' });

  } catch (error) {
    console.error('Erro ao salvar previsão:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar previsão.' });
  }
};

const getSavedPredictions = async (req, res) => {
  try {
    const { id: chartId } = req.params;
    const userId = req.userId;

    const predictions = predictionManager.getPredictions(userId, chartId);

    return res.json({ predictions });

  } catch (error) {
    console.error('Erro ao buscar previsões salvas:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar previsões.' });
  }
};

const getTransitMetadata = async (req, res) => {
  try {
    const { id: chartId } = req.params;
    const userId = req.userId;

    const chart = await AstralChart.findOne({ _id: chartId, userId });

    if (!chart) {
      return res.status(404).json({ error: 'Mapa astral não encontrado.' });
    }

    return res.json({
      chartId,
      birthData: chart.birthData,
      sunSign: chart.sunSign,
      moonSign: chart.moonSign,
      ascendant: chart.ascendant,
      planets: chart.planets.map(p => ({
        planet: p.planet,
        sign: p.sign,
        degree: p.degree,
        house: p.house
      })),
      availableEndpoints: {
        dailyTransits: `/api/astral-charts/${chartId}/transits`,
        weeklyTransits: `/api/astral-charts/${chartId}/transits/weekly`,
        transitsForDate: `/api/astral-charts/${chartId}/transits/date?date=YYYY-MM-DD`,
        natalChart: `/api/astral-charts/${chartId}`
      }
    });

  } catch (error) {
    console.error('Erro ao buscar metadados:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar metadados.' });
  }
};

module.exports = {
  getTransits,
  getWeeklyTransits,
  getTransitsForDate,
  savePrediction,
  getSavedPredictions,
  getTransitMetadata
};