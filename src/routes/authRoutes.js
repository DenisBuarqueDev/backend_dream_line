const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, resendVerification, forgotPassword, validateResetToken, resetPassword } = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');
const verifyRecaptcha = require('../middleware/verifyRecaptcha');

router.post('/register', verifyRecaptcha, asyncHandler(register));
router.post('/login', verifyRecaptcha, asyncHandler(login));
router.get('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-verification', asyncHandler(resendVerification));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.get('/validate-reset-token', asyncHandler(validateResetToken));
router.post('/reset-password', asyncHandler(resetPassword));

module.exports = router;
