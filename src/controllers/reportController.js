const asyncHandler = require('../middleware/asyncHandler');
const { successResponse } = require('../utils/response');
const { generateReport } = require('../services/reportService');
const memoryService = require('../services/memoryService');

exports.getReport = asyncHandler(async (req, res) => {
  const data = await generateReport(req.userId);
  memoryService.updateOnReport(req.userId);
  successResponse(res, data);
});
