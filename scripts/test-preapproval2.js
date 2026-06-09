require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');

const MP_API_URL = 'https://api.mercadopago.com';
const TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function testVariations() {
  const amount = parseFloat(process.env.MERCADOPAGO_PREMIUM_AMOUNT || '24.90');
  const backUrl = process.env.FRONTEND_URL || 'https://frontend-dream-line.vercel.app';

  // Test 1: Without payer_email
  console.log('\n=== TESTE 1: SEM payer_email ===');
  try {
    const body1 = {
      reason: 'Dream Line Premium',
      external_reference: 'test_1:premium',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: amount,
        currency_id: 'BRL',
      },
      back_url: backUrl + '/payment-success',
      status: 'pending',
    };
    console.log('Body:', JSON.stringify(body1, null, 2));
    const r1 = await axios.post(`${MP_API_URL}/preapproval`, body1, { headers });
    console.log('✅ Resposta:', JSON.stringify(r1.data, null, 2));
  } catch (e) {
    console.log('❌ Erro:', e.response?.data || e.message);
  }

  // Test 2: With card_token_id approach (if we had one)
  console.log('\n=== TESTE 2: Com card_token_id (mock) ===');
  try {
    const body2 = {
      reason: 'Dream Line Premium',
      external_reference: 'test_2:premium',
      payer_email: 'comprador@dreamline.app',
      card_token_id: 'abc123',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: amount,
        currency_id: 'BRL',
      },
      back_url: backUrl + '/payment-success',
      status: 'authorized',
    };
    console.log('Body:', JSON.stringify(body2, null, 2));
    const r2 = await axios.post(`${MP_API_URL}/preapproval`, body2, { headers });
    console.log('✅ Resposta:', JSON.stringify(r2.data, null, 2));
  } catch (e) {
    console.log('❌ Erro:', e.response?.data || e.message);
  }

  // Test 3: Get account info
  console.log('\n=== TESTE 3: Verificando conta MP ===');
  try {
    const r3 = await axios.get(`${MP_API_URL}/users/me`, { headers });
    console.log('✅ Conta MP:', JSON.stringify({ id: r3.data.id, email: r3.data.email, site: r3.data.site }, null, 2));
  } catch (e) {
    console.log('❌ Erro:', e.response?.data || e.message);
  }

  // Test 4: Check if preapproval_plan endpoint works
  console.log('\n=== TESTE 4: Criar preapproval_plan ===');
  try {
    const body4 = {
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
    console.log('Body:', JSON.stringify(body4, null, 2));
    const r4 = await axios.post(`${MP_API_URL}/preapproval_plan`, body4, { headers });
    console.log('✅ Plano criado:', JSON.stringify(r4.data, null, 2));
    console.log('\nPLAN ID:', r4.data.id);
  } catch (e) {
    console.log('❌ Erro:', e.response?.data || e.message);
  }
}

testVariations();
