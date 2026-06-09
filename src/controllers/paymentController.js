const crypto = require('crypto');
const { errorResponse, successResponse } = require('../utils/response');
const { processPaymentEvent } = require('../services/mercadoPagoCheckoutService');

function verifyWebhookSignature(req) {
  const signatureHeader = req.headers['x-signature'];
  if (!signatureHeader) return true;

  const pairs = {};
  signatureHeader.split(',').forEach(p => {
    const eqIdx = p.indexOf('=');
    if (eqIdx > 0) {
      pairs[p.slice(0, eqIdx).trim()] = p.slice(eqIdx + 1).trim();
    }
  });

  const ts = pairs['ts'];
  const v1 = pairs['v1'];
  if (!ts || !v1) return true;

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;

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

    const isPaymentApproved =
      action === 'payment.approved' ||
      action === 'payment.updated' ||
      type === 'payment';

    if (!isPaymentApproved) {
      return successResponse(res, { processed: false, reason: 'evento ignorado' });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return errorResponse(res, 'ID do pagamento não fornecido', 400);
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;

    const result = await processPaymentEvent({ paymentId, ip, userAgent });

    return successResponse(res, result);
  } catch (error) {
    console.error('[MP Webhook] Erro:', error.message);
    next(error);
  }
};

const testWebhook = async (req, res, next) => {
  try {
    const { data } = req.body;
    const paymentId = data?.id || 'test_payment_id';

    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'test-agent';

    const result = await processPaymentEvent({ paymentId, ip, userAgent });

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
