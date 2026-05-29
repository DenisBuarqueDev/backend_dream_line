const energyPanelService = require('../services/energyPanelService');

const getEnergyOfTheDay = async (req, res) => {
  try {
    const userId = req.userId;

    const energyData = await energyPanelService.getEnergyOfTheDay(userId);

    return res.json({
      success: true,
      data: energyData,
      meta: {
        generatedAt: new Date().toISOString(),
        userId
      }
    });

  } catch (error) {
    console.error('Erro ao obter energia do dia:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao calcular energia do dia.'
    });
  }
};

const getWeeklyEnergy = async (req, res) => {
  try {
    const userId = req.userId;
    const { days = 7 } = req.query;

    const parsedDays = parseInt(days, 10);
    if (parsedDays < 1 || parsedDays > 30) {
      return res.status(400).json({
        success: false,
        error: 'Dias deve estar entre 1 e 30.'
      });
    }

    const weeklyData = await energyPanelService.getWeeklyEnergy(userId, parsedDays);

    return res.json({
      success: true,
      data: weeklyData,
      meta: {
        generatedAt: new Date().toISOString(),
        userId,
        days: parsedDays
      }
    });

  } catch (error) {
    console.error('Erro ao obter energia semanal:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao calcular energia semanal.'
    });
  }
};

const getAstrologyOnly = async (req, res) => {
  try {
    const userId = req.userId;

    const energyData = await energyPanelService.getEnergyOfTheDay(userId);

    return res.json({
      success: true,
      data: energyData.astrology
    });

  } catch (error) {
    console.error('Erro ao obter energia astrológica:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao calcular energia astrológica.'
    });
  }
};

const getNumerologyOnly = async (req, res) => {
  try {
    const userId = req.userId;

    const energyData = await energyPanelService.getEnergyOfTheDay(userId);

    return res.json({
      success: true,
      data: energyData.numerology
    });

  } catch (error) {
    console.error('Erro ao obter energia numerológica:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao calcular energia numerológica.'
    });
  }
};

const getSleepOnly = async (req, res) => {
  try {
    const userId = req.userId;

    const energyData = await energyPanelService.getEnergyOfTheDay(userId);

    return res.json({
      success: true,
      data: energyData.sleep
    });

  } catch (error) {
    console.error('Erro ao obter dados de sono:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao obter dados de sono.'
    });
  }
};

const getEmotionsOnly = async (req, res) => {
  try {
    const userId = req.userId;

    const energyData = await energyPanelService.getEnergyOfTheDay(userId);

    return res.json({
      success: true,
      data: energyData.emotions
    });

  } catch (error) {
    console.error('Erro ao obter dados emocionais:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao obter dados emocionais.'
    });
  }
};

const getRecommendationsOnly = async (req, res) => {
  try {
    const userId = req.userId;

    const energyData = await energyPanelService.getEnergyOfTheDay(userId);

    return res.json({
      success: true,
      data: {
        recommendations: energyData.recommendations
      }
    });

  } catch (error) {
    console.error('Erro ao obter recomendações:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar recomendações.'
    });
  }
};

module.exports = {
  getEnergyOfTheDay,
  getWeeklyEnergy,
  getAstrologyOnly,
  getNumerologyOnly,
  getSleepOnly,
  getEmotionsOnly,
  getRecommendationsOnly
};