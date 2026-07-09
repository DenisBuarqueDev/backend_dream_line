const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/response');
const Favorite = require('../models/Favorite');

exports.toggle = asyncHandler(async (req, res) => {
  const { dreamId } = req.body;
  if (!dreamId) return errorResponse(res, 'dreamId é obrigatório', 400);

  const existing = await Favorite.findOne({ userId: req.userId, dreamId });
  if (existing) {
    await existing.deleteOne();
    return successResponse(res, { favorited: false, dreamId });
  }

  await Favorite.create({ userId: req.userId, dreamId });
  successResponse(res, { favorited: true, dreamId });
});

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [favorites, total] = await Promise.all([
    Favorite.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('dreamId'),
    Favorite.countDocuments({ userId: req.userId }),
  ]);

  const dreams = favorites.map(f => f.dreamId).filter(Boolean);

  successResponse(res, {
    dreams,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

exports.check = asyncHandler(async (req, res) => {
  const { dreamId } = req.params;
  const favorite = await Favorite.findOne({ userId: req.userId, dreamId });
  successResponse(res, { favorited: !!favorite });
});
