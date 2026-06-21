const crypto = require('crypto');
const { errorResponse, successResponse } = require('../utils/response');
const { processPaymentEvent } = require('../services/mercadoPagoCheckoutService');

/*
 * Validação oficial Mercado Pago x-signature
 *
 * Template: id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
 *
 * - [data.id_url]  = req.query['data.id'] (query params). Se alfanumérico, lowercased.
 * - [x-request-id_header] = req.headers['x-request-id']
 * - [ts_header]    = ts extraído do header x-signature
 * - Se qualquer valor estiver ausente, remover o segmento
 */
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
  const xRequestId = req.headers['x-request-id'] || '';
  const dataIdFromQuery = req.query?.['data.id'] || '';

  if (!ts || !v1) {
    console.warn('[MP Signature] Header x-signature sem ts/v1');
    return true;
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[MP Signature] MERCADOPAGO_WEBHOOK_SECRET não configurado');
    return true;
  }

  const rawId = dataIdFromQuery;
  const dataId = rawId && !/^\d+$/.test(rawId) ? rawId.toLowerCase() : rawId;

  const parts = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (xRequestId) parts.push(`request-id:${xRequestId}`);
  parts.push(`ts:${ts}`);
  const manifest = parts.join(';') + ';';

  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest, 'utf8')
    .digest('hex');

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
    if (!valid) {
      console.log('[MP Signature] Assinatura inválida');
      console.log('[MP Signature] dataId presente:', !!rawId);
      console.log('[MP Signature] x-request-id presente:', !!xRequestId);
      console.log('[MP Signature] v1 prefix:', v1.substring(0, 6));
    } else {
      console.log('[MP Signature] Assinatura válida');
    }
    return valid;
  } catch (err) {
    console.warn('[MP Signature] Erro ao comparar HMAC');
    return false;
  }
}

const handleWebhook = async (req, res, next) => {
  try {
    const body = req.body || {};
    const query = req.query || {};

    const action = body.action;
    const type = body.type;
    const topic = body.topic;
    const data = body.data;

    const queryDataId = query['data.id'];
    const queryId = query.id;
    const queryType = query.type;
    const queryTopic = query.topic;

    let paymentId = data?.id || body.id || body.resource?.id || queryDataId || queryId;

    const isPayment = !!paymentId && (
      (action && action.startsWith('payment.')) ||
      type === 'payment' ||
      topic === 'payment' ||
      queryType === 'payment' ||
      queryTopic === 'payment'
    );

    if (!isPayment || !paymentId) {
      console.log('[MP Webhook] Ignorado:', { action, type, topic, queryType, queryTopic, paymentId });
      return successResponse(res, { processed: false, reason: 'evento ignorado' });
    }

    if (!verifyWebhookSignature(req)) {
      console.warn('[MP Webhook] Assinatura inválida — recusado');
      return errorResponse(res, 'Assinatura inválida', 401);
    }

    console.log('[MP Webhook] Processando payment:', paymentId);

    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;

    const result = await processPaymentEvent({ paymentId, ip, userAgent });

    console.log('[MP Webhook] Resultado:', result.processed ? 'processado' : result.reason);

    return successResponse(res, result);
  } catch (error) {
    console.error('[MP Webhook] Erro:', error.message);
    return errorResponse(res, 'Erro interno', 500);
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
