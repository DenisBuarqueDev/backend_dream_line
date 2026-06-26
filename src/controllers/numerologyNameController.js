const NameNumerology = require('../models/NameNumerology');
const User = require('../models/User');
const { generateAll } = require('../services/numerologyNameService');
const { successResponse, errorResponse } = require('../utils/response');

exports.generate = async (req, res, next) => {
  try {
    const { fullName, birthDate } = req.body;

    if (!fullName || !fullName.trim()) {
      return errorResponse(res, 'Nome completo é obrigatório.', 400);
    }

    if (!birthDate) {
      return errorResponse(res, 'Data de nascimento é obrigatória.', 400);
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      return errorResponse(res, 'Formato de data inválido. Use AAAA-MM-DD.', 400);
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado.', 404);
    }

    if (user.checkExpiry()) {
      await user.save();
    }

    const incremented = await user.incrementNameNumerologyCount();
    if (!incremented) {
      const limits = User.getPlanLimits(user.plan);
      return errorResponse(res, `Limite diário de ${limits.maxNameNumerologiesPerDay} numerologia(s) atingido.`, 403);
    }

    const calculations = generateAll(fullName.trim(), birthDate);

    const record = await NameNumerology.create({
      userId: req.userId,
      fullName: fullName.trim(),
      birthDate,
      calculations
    });

    successResponse(res, { record }, 201);
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      NameNumerology.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('fullName birthDate createdAt'),
      NameNumerology.countDocuments({ userId: req.userId })
    ]);

    successResponse(res, { records, total, page, limit });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const record = await NameNumerology.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!record) {
      return errorResponse(res, 'Numerologia não encontrada.', 404);
    }

    successResponse(res, { record });
  } catch (error) {
    next(error);
  }
};

exports.getRemaining = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado.', 404);
    }

    const planInfo = user.checkUserPlan();
    successResponse(res, {
      remaining: planInfo.remainingNameNumerologies,
      max: planInfo.maxNameNumerologiesPerDay,
      plan: planInfo.plan
    });
  } catch (error) {
    next(error);
  }
};
