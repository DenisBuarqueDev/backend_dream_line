const crypto = require('crypto');
const { errorResponse, successResponse } = require('../utils/response');
const { processPaymentEvent } = require('../services/mercadoPagoCheckoutService');

function verifyWebhookSignature(req) {
  const signatureHeader = req.headers['x-signature'];
  if (!signatureHeader) {
    console.log('[MP Signature] Header x-signature ausente');
    return true;
  }

  console.log('[MP Signature] Header bruto:', signatureHeader);

  const pairs = {};
  signatureHeader.split(',').forEach(p => {
    const eqIdx = p.indexOf('=');
    if (eqIdx > 0) {
      pairs[p.slice(0, eqIdx).trim()] = p.slice(eqIdx + 1).trim();
    }
  });

  const ts = pairs['ts'];
  const v1 = pairs['v1'];
  const requestId = req.headers['x-request-id'] || '';

  console.log('[MP Signature] ts:', ts);
  console.log('[MP Signature] v1:', v1);
  console.log('[MP Signature] x-request-id:', requestId);

  if (!ts || !v1) {
    console.warn('[MP Signature] Header sem ts/v1:', JSON.stringify(pairs));
    return true;
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  console.log('[MP Signature] secret configurado?', !!secret);

  if (!secret) {
    console.warn('[MP Signature] MERCADOPAGO_WEBHOOK_SECRET não configurado');
    return true;
  }

  const body = req.body || {};
  const bodyDataId = body.data?.id || body.id || '';
  const queryDataId = req.query?.['data.id'] || req.query?.id || '';
  const dataId = bodyDataId || queryDataId || '';

  const type = body.type || req.query?.type || body.topic || req.query?.topic || '';

  console.log('[MP Signature] dataId usado:', dataId);
  console.log('[MP Signature] type usado:', type);
  console.log('[MP Signature] bodyDataId:', bodyDataId);
  console.log('[MP Signature] queryDataId:', queryDataId);

  const manifests = [
    { label: 'dataId|type|dataId|ts',      value: `${dataId}|${type}|${dataId}|${ts}` },
    { label: 'dataId|type|ts',              value: `${dataId}|${type}|${ts}` },
    { label: 'dataId|requestId|dataId|ts',  value: `${dataId}|${requestId}|${dataId}|${ts}` },
    { label: 'dataId|requestId|ts',         value: `${dataId}|${requestId}|${ts}` },
    { label: 'id:dataId;type:type',         value: `id:${dataId};type:${type}` },
    { label: 'data.id|type|data.id|ts',     value: `${queryDataId || bodyDataId}|${type}|${queryDataId || bodyDataId}|${ts}` },
  ];

  for (const { label, value } of manifests) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(value, 'utf8')
      .digest('hex');

    if (expected === v1) {
      console.log('[MP Signature] ✓ Assinatura válida — formato:', label);
      console.log('[MP Signature] Manifest:', value);
      return true;
    }

    console.log(`[MP Signature]   ${label}: esperado=${expected}  recebido=${v1}  match=${expected === v1}`);
  }

  console.warn('[MP Signature] ✗ Nenhum formato de manifest funcionou');
  return false;
}

const handleWebhook = async (req, res, next) => {
  try {
    const body = req.body || {};
    const query = req.query || {};

    console.log('[MP DEBUG] Headers:', JSON.stringify({
      'x-signature': req.headers['x-signature'],
      'x-request-id': req.headers['x-request-id'],
      'content-type': req.headers['content-type'],
    }));
    console.log('[MP DEBUG] Body:', JSON.stringify(body));
    console.log('[MP DEBUG] Query:', JSON.stringify(query));
    console.log('[MP DEBUG] Secret configurado?', !!process.env.MERCADOPAGO_WEBHOOK_SECRET);

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

    console.log('[MP Webhook] Recebido:', JSON.stringify({
      action, type, topic,
      queryType, queryTopic,
      paymentId,
      queryDataId, queryId,
      isPayment,
    }));

    if (!isPayment || !paymentId) {
      console.log('[MP Webhook] Evento ignorado:', { action, type, topic, queryType, queryTopic, paymentId });
      return successResponse(res, { processed: false, reason: 'evento ignorado' });
    }

    if (!verifyWebhookSignature(req)) {
      console.warn('[MP Webhook] Assinatura inválida — continuando processamento mesmo assim');
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
