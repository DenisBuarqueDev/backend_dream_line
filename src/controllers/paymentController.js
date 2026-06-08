const crypto = require('crypto');
const { errorResponse, successResponse } = require('../utils/response');
const { processWebhookEvent } = require('../services/mercadoPagoSubscriptionService');

function verifyWebhookSignature(req) {
  const signatureHeader = req.headers['x-signature'];
  if (!signatureHeader) {
    return false;
  }

  const pairs = {};
  signatureHeader.split(',').forEach(p => {
    const eqIdx = p.indexOf('=');
    if (eqIdx > 0) {
      pairs[p.slice(0, eqIdx).trim()] = p.slice(eqIdx + 1).trim();
    }
  });

  const ts = pairs['ts'];
  const v1 = pairs['v1'];
  if (!ts || !v1) {
    return false;
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('MERCADOPAGO_WEBHOOK_SECRET não configurado');
    return false;
  }

  const { id, type, data } = req.body;
  const dataId = data?.id || '';
  const manifest = `${id}|${type}|${dataId}|${ts}`;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

const handleWebhook = async (req, res, next) => {
  try {
    const { action, data, type } = req.body;

    if (!verifyWebhookSignature(req)) {
      return errorResponse(res, 'Assinatura do webhook inválida', 401);
    }

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
