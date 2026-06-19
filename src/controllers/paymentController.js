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
  if (!ts || !v1) {
    console.warn('[MP Signature] Header sem ts/v1:', JSON.stringify(pairs));
    return true;
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[MP Signature] MERCADOPAGO_WEBHOOK_SECRET não configurado');
    return true;
  }

  const body = req.body;
  const dataId = body.data?.id || body.id || '';
  const manifestId = body.data?.id || body.id || '';
  const manifest = `${manifestId}|${body.type || ''}|${dataId}|${ts}`;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest, 'utf8')
    .digest('hex');

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
    if (!valid) {
      console.warn('[MP Signature] HMAC mismatch');
      console.warn('[MP Signature] Manifest:', manifest);
      console.warn('[MP Signature] Esperado:', expected);
      console.warn('[MP Signature] Recebido:', v1);
    }
    return valid;
  } catch {
    console.warn('[MP Signature] Erro ao comparar HMAC');
    return false;
  }
}

const handleWebhook = async (req, res, next) => {
  try {
    const body = req.body;
    const action = body.action;
    const type = body.type;
    const topic = body.topic;
    const data = body.data;

    const isPayment = action === 'payment.approved' ||
      action === 'payment.updated' ||
      type === 'payment' ||
      topic === 'payment';

    let paymentId = data?.id || body.id || body.resource?.id;

    console.log('[MP Webhook] Recebido:', JSON.stringify({
      action,
      type,
      topic,
      paymentId,
      hasSignature: !!req.headers['x-signature'],
      contentType: req.headers['content-type'],
      queryKeys: Object.keys(req.query || {})
    }));

    if (!paymentId && req.query?.id) {
      paymentId = req.query.id;
      console.log('[MP Webhook] paymentId extraído de query string:', paymentId);
    }

    if (!isPayment || !paymentId) {
      console.log('[MP Webhook] Evento ignorado:', { action, type, topic, paymentId });
      return successResponse(res, { processed: false, reason: 'evento ignorado' });
    }

    if (!verifyWebhookSignature(req)) {
      console.warn('[MP Webhook] Assinatura inválida — continuando processamento');
    }

    console.log('[MP Webhook] Processando payment:', paymentId);

    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;

    const result = await processPaymentEvent({ paymentId, ip, userAgent });

    console.log('[MP Webhook] Resultado:', JSON.stringify(result));

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
