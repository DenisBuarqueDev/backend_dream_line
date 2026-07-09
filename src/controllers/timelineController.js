const asyncHandler = require('../middleware/asyncHandler');
const { successResponse } = require('../utils/response');
const { generateTimeline } = require('../services/timelineService');

exports.getTimeline = asyncHandler(async (req, res) => {
  const data = await generateTimeline(req.userId);
  successResponse(res, data);
});
