const DailyCompanion = require('../models/DailyCompanion');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse } = require('../utils/response');

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

exports.getHomeCompanion = asyncHandler(async (req, res) => {
  const data = await DailyCompanion.findOne({ userId: req.userId, date: todayStr() })
    .select('_id title message category priority viewed generatedAt')
    .lean();

  if (!data) {
    return successResponse(res, { available: false, message: null });
  }

  successResponse(res, {
    available: true,
    message: {
      title: data.title,
      message: data.message,
      category: data.category,
      priority: data.priority,
      viewed: data.viewed,
      generatedAt: data.generatedAt,
    },
  });
});

exports.markAsViewed = asyncHandler(async (req, res) => {
  const existing = await DailyCompanion.findOne({ userId: req.userId, date: todayStr() }).lean();

  if (!existing) {
    return successResponse(res, { viewed: false });
  }

  if (existing.viewed && existing.viewedAt) {
    return successResponse(res, { viewed: true, already: true });
  }

  await DailyCompanion.findByIdAndUpdate(existing._id, {
    $set: {
      viewed: true,
      viewedAt: new Date(),
      'metadata.lastInteraction': new Date().toISOString(),
    },
    $inc: { 'metadata.viewedCount': 1 },
  });

  successResponse(res, { viewed: true });
});
