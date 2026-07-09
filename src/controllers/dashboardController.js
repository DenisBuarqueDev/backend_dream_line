const { getDashboardData } = require('../services/dashboardService');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse } = require('../utils/response');
const User = require('../models/User');

exports.getDashboard = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId).select('-password').lean();

  const dashboard = await getDashboardData(userId, user);

  successResponse(res, {
    user: {
      name: user?.name || '',
      email: user?.email || '',
      plan: user?.plan || 'free',
      isPremium: user?.isPremium || false,
    },
    dashboard,
    generatedAt: new Date().toISOString(),
  });
});
