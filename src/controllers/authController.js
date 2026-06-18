const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const { errorResponse, successResponse } = require("../utils/response");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../services/emailService");

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

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      dreamLimitResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    await sendVerificationEmail(user.email, verificationToken);

    return successResponse(
      res,
      {
        message: "User registered successfully. Please verify your email.",
        email: user.email,
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

    if (!user.emailVerified) {
      return errorResponse(res, "Verifique seu e-mail antes de acessar o Dream Line.", 403);
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
        canSeeWeeklySummary: planInfo.canSeeWeeklySummary,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return errorResponse(res, "Token de verificação não fornecido.", 400);
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return errorResponse(res, "Token de verificação inválido ou expirado.", 400);
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return successResponse(res, {
      message: "E-mail verificado com sucesso!",
    });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, "Email is required", 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return successResponse(res, {
        message: "Se o e-mail estiver cadastrado, um novo link será enviado.",
      });
    }

    if (user.emailVerified) {
      return successResponse(res, {
        message: "Se o e-mail estiver cadastrado, um novo link será enviado.",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    await sendVerificationEmail(user.email, verificationToken);

    return successResponse(res, {
      message: "Se o e-mail estiver cadastrado, um novo link será enviado.",
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, "Email is required", 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      await sendPasswordResetEmail(user.email, resetToken);
    }

    return successResponse(res, {
      message: "Se existir uma conta vinculada a este e-mail, enviaremos instruções para recuperação.",
    });
  } catch (error) {
    next(error);
  }
};

const validateResetToken = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.json({ valid: false });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    return res.json({ valid: !!user });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return errorResponse(res, "Token and password are required", 400);
    }

    if (password.length < 6) {
      return errorResponse(res, "Password must be at least 6 characters", 400);
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return errorResponse(res, "Token inválido ou expirado.", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return successResponse(res, {
      message: "Senha redefinida com sucesso!",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, verifyEmail, resendVerification, forgotPassword, validateResetToken, resetPassword };
