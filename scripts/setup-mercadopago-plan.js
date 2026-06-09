require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');

const MP_API_URL = 'https://api.mercadopago.com';

function getHeaders() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    console.error('ERRO: MERCADOPAGO_ACCESS_TOKEN não configurado no .env');
    process.exit(1);
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function createPlan() {
  const amount = parseFloat(process.env.MERCADOPAGO_PREMIUM_AMOUNT);
  if (isNaN(amount)) {
    console.error('ERRO: MERCADOPAGO_PREMIUM_AMOUNT não configurado ou inválido');
    process.exit(1);
  }

  const backUrl = process.env.FRONTEND_URL || 'https://frontend-dream-line.vercel.app';

  const body = {
    reason: 'Dream Line Premium',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: amount,
      currency_id: 'BRL',
    },
    payment_methods_allowed: {
      payment_types: [{ id: 'credit_card' }],
    },
    back_url: backUrl + '/payment-success',
  };

  console.log('=== CRIANDO PLANO DE ASSINATURA NO MERCADO PAGO ===\n');
  console.log('Payload:', JSON.stringify(body, null, 2), '\n');

  try {
    const response = await axios.post(`${MP_API_URL}/preapproval_plan`, body, {
      headers: getHeaders(),
    });

    console.log('✅ PLANO CRIADO COM SUCESSO!\n');
    console.log('Resposta:', JSON.stringify(response.data, null, 2), '\n');
    console.log('═══════════════════════════════════════════');
    console.log(`🏷️  PREAPPROVAL_PLAN_ID: ${response.data.id}`);
    console.log(`📌 Adicione esta linha ao seu .env:`);
    console.log(`MERCADOPAGO_PREMIUM_PLAN_ID=${response.data.id}`);
    console.log('═══════════════════════════════════════════\n');

    return response.data;
  } catch (error) {
    console.error('❌ ERRO AO CRIAR PLANO:\n');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

createPlan();
