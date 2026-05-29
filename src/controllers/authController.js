const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { errorResponse, successResponse } = require("../utils/response");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, "Email and password are required", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(res, "Invalid email format", 400);
    }

    if (password.length < 6) {
      return errorResponse(res, "Password must be at least 6 characters", 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse(res, "Email already registered", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      email: email.toLowerCase(), 
      password: hashedPassword,
      dreamLimitResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    const token = generateToken(user._id);
    const planInfo = user.checkUserPlan();

    return successResponse(
      res,
      {
        message: "User registered successfully",
        token,
        user: { 
          id: user._id, 
          email: user.email, 
          plan: user.plan,
          dreamCount: user.dreamCount,
          dreamLimitResetAt: user.dreamLimitResetAt,
          remainingDreams: planInfo.remainingDreams,
          maxDreams: planInfo.maxDreams,
          canGenerateImage: planInfo.canGenerateImage,
          canUseSleepMode: planInfo.canUseSleepMode,
          canSeeWeeklySummary: planInfo.canSeeWeeklySummary
        },
      },
      201,
    );
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, "Email and password are required", 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    const planInfo = user.checkUserPlan();
    const token = generateToken(user._id);

    return successResponse(res, {
      message: "Login successful",
      token,
      user: { 
        id: user._id, 
        email: user.email, 
        plan: user.plan,
        dreamCount: user.dreamCount,
        dreamLimitResetAt: user.dreamLimitResetAt,
        remainingDreams: planInfo.remainingDreams,
        maxDreams: planInfo.maxDreams,
        canGenerateImage: planInfo.canGenerateImage,
        canUseSleepMode: planInfo.canUseSleepMode,
        canSeeWeeklySummary: planInfo.canSeeWeeklySummary
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login };
