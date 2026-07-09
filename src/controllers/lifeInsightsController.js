const asyncHandler = require('../middleware/asyncHandler');
const { successResponse } = require('../utils/response');
const { generateLifeInsights } = require('../services/lifeInsightsService');

exports.getLifeInsights = asyncHandler(async (req, res) => {
  const data = await generateLifeInsights(req.userId);
  successResponse(res, data);
});
