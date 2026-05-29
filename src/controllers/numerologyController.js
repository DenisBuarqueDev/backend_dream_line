const User = require('../models/User');
const AstralChart = require('../models/AstralChart');
const numerologyService = require('../services/numerologyService');

const getDailyNumerology = async (req, res) => {
  try {
    const userId = req.userId;
    const currentDate = new Date().toISOString();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (!user.birthDate) {
      return res.status(400).json({ 
        error: 'Data de nascimento não cadastrada.',
        hint: 'Atualize seu perfil com a data de nascimento para usar numerologia.'
      });
    }

    const birthDate = new Date(user.birthDate).toISOString().split('T')[0];

    const report = numerologyService.generateDailyNumerology(birthDate, currentDate);

    return res.json(report.toJSON());

  } catch (error) {
    console.error('Erro ao calcular numerologia diária:', error);
    return res.status(500).json({ error: 'Erro interno ao calcular numerologia.' });
  }
};

const getLifePath = async (req, res) => {
  try {
    const userId = req.userId;
    const { birthDate } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const date = birthDate || (user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : null);
    
    if (!date) {
      return res.status(400).json({ error: 'Data de nascimento não disponível.' });
    }

    const lifePath = numerologyService.calculateLifePathNumber(date);

    return res.json(lifePath.toJSON());

  } catch (error) {
    console.error('Erro ao calcular número do caminho de vida:', error);
    return res.status(500).json({ error: 'Erro ao calcular número do caminho de vida.' });
  }
};

const getPersonalNumber = async (req, res) => {
  try {
    const userId = req.userId;
    const { date } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (!user.birthDate) {
      return res.status(400).json({ error: 'Data de nascimento não cadastrada.' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const birthDate = new Date(user.birthDate).toISOString().split('T')[0];

    const personalNumber = numerologyService.calculatePersonalNumber(birthDate, targetDate);

    return res.json(personalNumber.toJSON());

  } catch (error) {
    console.error('Erro ao calcular número pessoal:', error);
    return res.status(500).json({ error: 'Erro ao calcular número pessoal.' });
  }
};

const getUniversalDayNumber = async (req, res) => {
  try {
    const { date } = req.query;

    const targetDate = date || new Date().toISOString();
    const universalNumber = numerologyService.calculateUniversalDayNumber(targetDate);

    return res.json(universalNumber.toJSON());

  } catch (error) {
    console.error('Erro ao calcular número universal do dia:', error);
    return res.status(500).json({ error: 'Erro ao calcular número universal.' });
  }
};

const getYearNumber = async (req, res) => {
  try {
    const userId = req.userId;
    const { year } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (!user.birthDate) {
      return res.status(400).json({ error: 'Data de nascimento não cadastrada.' });
    }

    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const birthDate = new Date(user.birthDate).toISOString().split('T')[0];

    const yearNumber = numerologyService.calculateYearNumber(birthDate, targetYear);

    return res.json(yearNumber);

  } catch (error) {
    console.error('Erro ao calcular número do ano:', error);
    return res.status(500).json({ error: 'Erro ao calcular número do ano.' });
  }
};

const getMonthNumber = async (req, res) => {
  try {
    const userId = req.userId;
    const { year, month } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (!user.birthDate) {
      return res.status(400).json({ error: 'Data de nascimento não cadastrada.' });
    }

    const now = new Date();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const birthDate = new Date(user.birthDate).toISOString().split('T')[0];

    const monthNumber = numerologyService.calculateMonthNumber(birthDate, targetYear, targetMonth);

    return res.json(monthNumber);

  } catch (error) {
    console.error('Erro ao calcular número do mês:', error);
    return res.status(500).json({ error: 'Erro ao calcular número do mês.' });
  }
};

const getCompatibility = async (req, res) => {
  try {
    const userId = req.userId;
    const { chartId } = req.query;

    if (!chartId) {
      return res.status(400).json({ error: 'ID do mapa astral é obrigatório.' });
    }

    const chart = await AstralChart.findOne({ _id: chartId, userId });
    if (!chart) {
      return res.status(404).json({ error: 'Mapa astral não encontrado.' });
    }

    const user = await User.findById(userId);
    if (!user || !user.birthDate) {
      return res.status(400).json({ error: 'Data de nascimento do usuário não disponível.' });
    }

    const birthDate = new Date(user.birthDate).toISOString().split('T')[0];
    const lifePath = numerologyService.calculateLifePathNumber(birthDate);

    const chartDate = chart.birthData.date.toISOString().split('T')[0];
    const chartLifePath = numerologyService.calculateLifePathNumber(chartDate);

    const compatibility = numerologyService.getCompatibilityNumber(
      lifePath.number,
      chartLifePath.number
    );

    return res.json({
      user: {
        lifePath: lifePath.number
      },
      chart: {
        name: chart.name,
        lifePath: chartLifePath.number
      },
      ...compatibility
    });

  } catch (error) {
    console.error('Erro ao calcular compatibilidade:', error);
    return res.status(500).json({ error: 'Erro ao calcular compatibilidade.' });
  }
};

const getInterpretations = async (req, res) => {
  try {
    const interpretations = numerologyService.getAllInterpretations();
    return res.json({ interpretations });
  } catch (error) {
    console.error('Erro ao buscar interpretações:', error);
    return res.status(500).json({ error: 'Erro ao buscar interpretações.' });
  }
};

module.exports = {
  getDailyNumerology,
  getLifePath,
  getPersonalNumber,
  getUniversalDayNumber,
  getYearNumber,
  getMonthNumber,
  getCompatibility,
  getInterpretations
};