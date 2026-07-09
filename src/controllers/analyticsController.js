const asyncHandler = require('../middleware/asyncHandler');
const { successResponse } = require('../utils/response');
const { getAnalytics } = require('../services/analyticsService');
const memoryService = require('../services/memoryService');

exports.getAnalytics = asyncHandler(async (req, res) => {
  const data = await getAnalytics(req.userId);
  memoryService.updateOnAnalytics(req.userId);
  successResponse(res, data);
});
