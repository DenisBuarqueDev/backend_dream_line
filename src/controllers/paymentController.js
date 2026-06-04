const { errorResponse, successResponse } = require('../utils/response');
const { processWebhookEvent } = require('../services/mercadoPagoSubscriptionService');

const handleWebhook = async (req, res, next) => {
  try {
    console.log('[MP Webhook] Recebido:', JSON.stringify(req.body, null, 2));

    const { action, data, type } = req.body;

    if (!action && !type) {
      return errorResponse(res, 'Payload inválido: action ou type obrigatório', 400);
    }

    const resourceId = data?.id;
    const resourceType = type || action?.split('.')[0];

    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;

    const result = await processWebhookEvent({
      action: action || '',
      resourceId,
      resourceType,
      rawBody: req.body,
      ip,
      userAgent,
    });

    return successResponse(res, result);
  } catch (error) {
    console.error('[MP Webhook] Erro no processamento:', error.message);
    next(error);
  }
};

const testWebhook = async (req, res, next) => {
  try {
    const { action, data, type } = req.body;

    const resourceId = data?.id || 'test_resource_id';
    const resourceType = type || action?.split('.')[0] || 'payment';

    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'test-agent';

    const result = await processWebhookEvent({
      action: action || 'payment.approved',
      resourceId,
      resourceType,
      rawBody: req.body,
      ip,
      userAgent,
    });

    return successResponse(res, {
      message: 'Webhook de teste processado',
      result,
    });
  } catch (error) {
    console.error('[MP Test Webhook] Erro:', error.message);
    next(error);
  }
};

module.exports = { handleWebhook, testWebhook };
