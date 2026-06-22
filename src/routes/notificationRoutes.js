const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  registerToken,
  unregisterToken,
  updateSettings,
  getSettings,
  sendTestNotification,
} = require('../controllers/notificationController');

router.post('/register-token', protect, registerToken);
router.post('/unregister-token', protect, unregisterToken);
router.put('/settings', protect, updateSettings);
router.get('/settings', protect, getSettings);
router.post('/test', protect, sendTestNotification);

module.exports = router;
