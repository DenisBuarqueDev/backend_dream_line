const { generateIntelligence } = require('../services/insightService');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse } = require('../utils/response');

exports.getIntelligence = asyncHandler(async (req, res) => {
  const data = await generateIntelligence(req.userId);
  successResponse(res, data);
});
