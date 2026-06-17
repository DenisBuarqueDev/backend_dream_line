const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');
const verifyRecaptcha = require('../middleware/verifyRecaptcha');

router.post('/register', verifyRecaptcha, asyncHandler(register));
router.post('/login', verifyRecaptcha, asyncHandler(login));

module.exports = router;