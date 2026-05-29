const User = require('../models/User');
const AstralChart = require('../models/AstralChart');
const luckyNumberService = require('../services/luckyNumberService');

const getLuckyNumbers = async (req, res) => {
  try {
    const userId = req.userId;
    const { enhance = "false" } = req.query;

    const user = await User.findById(userId);
    
    let birthDate = null;
    let sunSign = null;

    if (user?.birthDate) {
      birthDate = user.birthDate;
    } else {
      const latestChart = await AstralChart.findOne({ userId })
        .sort({ createdAt: -1 })
        .lean();
      
      if (latestChart?.birthData?.date) {
        birthDate = latestChart.birthData.date;
        sunSign = latestChart.sunSign;
      }
    }

    const useEnhancement = enhance === "true" && birthDate !== null;

    const result = luckyNumberService.generateAllLuckyGames({
      birthDate,
      sunSign,
      useEnhancement
    });

    return res.json({
      success: true,
      data: result,
      meta: {
        userHasBirthDate: birthDate !== null,
        usedEnhancement: result.usedEnhancement,
        generatedAt: result.generatedAt
      }
    });

  } catch (error) {
    console.error('Erro ao gerar números da sorte:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar números da sorte.'
    });
  }
};

const getSingleGame = async (req, res) => {
  try {
    const userId = req.userId;
    const { game, enhance = "false" } = req.query;

    const validGames = ['megaSena', 'lotofacil', 'quina', 'duplaSena', 'timemania'];
    if (!game || !validGames.includes(game)) {
      return res.status(400).json({
        success: false,
        error: `Jogo inválido. Escolha: ${validGames.join(', ')}`
      });
    }

    const user = await User.findById(userId);
    let birthDate = user?.birthDate || null;

    if (!birthDate) {
      const latestChart = await AstralChart.findOne({ userId })
        .sort({ createdAt: -1 })
        .lean();
      birthDate = latestChart?.birthData?.date || null;
    }

    const personalNumber = birthDate 
      ? luckyNumberService.calculatePersonalNumberFromBirthDate(birthDate) 
      : null;

    const useEnhancement = enhance === "true" && personalNumber !== null;
    const result = luckyNumberService.generateSingleGame(game, personalNumber, useEnhancement);

    const gameInfo = luckyNumberService.getGamesInfo()[game];

    return res.json({
      success: true,
      data: {
        game: game,
        gameName: gameInfo.name,
        numbers: result.numbers,
        formatted: result.formatted,
        timeDoCoracao: result.timeDoCoracao || null,
        personalNumber,
        disclaimer: luckyNumberService.DISCLAIMER
      }
    });

  } catch (error) {
    console.error('Erro ao gerar jogo individual:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar números do jogo.'
    });
  }
};

const getGamesInfo = async (req, res) => {
  try {
    const gamesInfo = luckyNumberService.getGamesInfo();
    const teams = luckyNumberService.getTeamsList();

    return res.json({
      success: true,
      data: {
        games: gamesInfo,
        teamsCount: teams.length,
        disclaimer: luckyNumberService.DISCLAIMER
      }
    });

  } catch (error) {
    console.error('Erro ao buscar informações dos jogos:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar informações dos jogos.'
    });
  }
};

const regenerateSingleGame = async (req, res) => {
  try {
    const userId = req.userId;
    const { game } = req.params;
    const { enhance = "false" } = req.query;

    const validGames = ['megaSena', 'lotofacil', 'quina', 'duplaSena', 'timemania'];
    if (!validGames.includes(game)) {
      return res.status(400).json({
        success: false,
        error: `Jogo inválido: ${game}`
      });
    }

    const user = await User.findById(userId);
    let birthDate = user?.birthDate || null;

    if (!birthDate) {
      const latestChart = await AstralChart.findOne({ userId })
        .sort({ createdAt: -1 })
        .lean();
      birthDate = latestChart?.birthData?.date || null;
    }

    const personalNumber = birthDate 
      ? luckyNumberService.calculatePersonalNumberFromBirthDate(birthDate) 
      : null;

    const useEnhancement = enhance === "true" && personalNumber !== null;
    const result = luckyNumberService.generateSingleGame(game, personalNumber, useEnhancement);

    return res.json({
      success: true,
      data: {
        game,
        numbers: result.numbers,
        formatted: result.formatted,
        timeDoCoracao: result.timeDoCoracao || null,
        disclaimer: luckyNumberService.DISCLAIMER
      }
    });

  } catch (error) {
    console.error('Erro ao regenerar números:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao regenerar números.'
    });
  }
};

module.exports = {
  getLuckyNumbers,
  getSingleGame,
  getGamesInfo,
  regenerateSingleGame
};