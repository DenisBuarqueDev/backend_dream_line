const MIN_SCORE = 0.5;

const verifyRecaptcha = async (req, res, next) => {
  const platform = (req.headers['x-platform'] || '').toLowerCase();
  if (platform === 'mobile') {
    return next();
  }

  const recaptchaToken = req.body.recaptchaToken;

  if (!recaptchaToken) {
    return res.status(403).json({
      success: false,
      message: 'Falha na validação de segurança.',
    });
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY não definida no ambiente');
    return res.status(403).json({
      success: false,
      message: 'Falha na validação de segurança.',
    });
  }

  try {
    const verificationURL = 'https://www.google.com/recaptcha/api/siteverify';

    const response = await fetch(verificationURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: recaptchaToken,
      }),
    });

    const data = await response.json();

    if (!data.success || data.score < MIN_SCORE) {
      return res.status(403).json({
        success: false,
        message: 'Falha na validação de segurança.',
      });
    }

    next();
  } catch (error) {
    console.error('Erro ao validar reCAPTCHA:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Falha na validação de segurança.',
    });
  }
};

module.exports = verifyRecaptcha;
