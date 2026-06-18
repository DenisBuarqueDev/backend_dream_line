const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const securityMiddleware = (app) => {
  app.set('trust proxy', 1);
  app.use(helmet());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, try again later' }
  });
  app.use('/api', limiter);
};

module.exports = securityMiddleware;