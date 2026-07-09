const DailyCheckin = require('../models/DailyCheckin');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/response');

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

exports.getToday = asyncHandler(async (req, res) => {
  const checkin = await DailyCheckin.findOne({ userId: req.userId, date: todayStr() }).lean();

  successResponse(res, {
    checkedIn: !!checkin,
    checkin: checkin || null,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const { mood, sleepQuality, wantRecordDream } = req.body;

  if (!mood || !sleepQuality) {
    return errorResponse(res, 'mood e sleepQuality são obrigatórios', 400);
  }

  const date = todayStr();

  const existing = await DailyCheckin.findOne({ userId: req.userId, date });
  if (existing) {
    return errorResponse(res, 'Check-in já realizado hoje', 409);
  }

  const checkin = await DailyCheckin.create({
    userId: req.userId,
    date,
    mood,
    sleepQuality,
    wantRecordDream: wantRecordDream || 'depois',
  });

  successResponse(res, {
    checkin: {
      id: checkin._id,
      date: checkin.date,
      mood: checkin.mood,
      sleepQuality: checkin.sleepQuality,
      wantRecordDream: checkin.wantRecordDream,
      createdAt: checkin.createdAt,
    },
    message: 'Obrigado por compartilhar como você está hoje.',
  });
});
