const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { checkFeatureAccess } = require('../middleware/planMiddleware');
const {
  registerToken,
  unregisterToken,
  updateSettings,
  getSettings,
  sendTestNotification,
} = require('../controllers/notificationController');

router.post('/register-token', protect, checkFeatureAccess('notifications'), registerToken);
router.post('/unregister-token', protect, checkFeatureAccess('notifications'), unregisterToken);
router.put('/settings', protect, checkFeatureAccess('notifications'), updateSettings);
router.get('/settings', protect, checkFeatureAccess('notifications'), getSettings);
router.post('/test', protect, checkFeatureAccess('notifications'), sendTestNotification);

module.exports = router;
