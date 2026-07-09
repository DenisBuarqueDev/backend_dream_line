const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/response');
const { generateCoachReport } = require('../services/dreamCoachService');

exports.getCoachReport = asyncHandler(async (req, res) => {
  const data = await generateCoachReport(req.userId);
  successResponse(res, data);
});
