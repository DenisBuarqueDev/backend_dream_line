require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');

const MP_API_URL = 'https://api.mercadopago.com';
const TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

function getHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
}

const PLAN_ID = '8d17f551bb7940eea1b912e9f2647ab3';
const ACCOUNT_EMAIL = 'test_user_1408329457@testuser.com';
const USER_EMAIL = 'test_user_1408329457@testuser.com'; // same as account for testing

async function run() {
  console.log('=== TESTE PLANO CRIADO ===\n');
  console.log('Plan ID:', PLAN_ID);
  console.log('Account email:', ACCOUNT_EMAIL);
  console.log('');

  // Test A: Create subscription WITH plan_id + account email (status: pending)
  console.log('--- TESTE A: Subscription com plan_id + account email (pending) ---');
  try {
    const bodyA = {
      preapproval_plan_id: PLAN_ID,
      external_reference: 'test_A:premium',
      payer_email: ACCOUNT_EMAIL,
      reason: 'Dream Line Premium',
      back_url: 'https://frontend-dream-line.vercel.app/payment-success',
      status: 'pending',
    };
    console.log('Body:', JSON.stringify(bodyA, null, 2));
    const rA = await axios.post(`${MP_API_URL}/preapproval`, bodyA, { headers: getHeaders() });
    console.log('✅ Resposta:', JSON.stringify(rA.data, null, 2));
    console.log('✅ Init Point:', rA.data.init_point);
  } catch (e) {
    console.log('❌ Erro:', JSON.stringify(e.response?.data || e.message, null, 2));
  }

  // Test B: Create subscription WITHOUT plan_id + account email (pending)  
  console.log('\n--- TESTE B: Subscription sem plan_id + account email (pending) ---');
  try {
    const bodyB = {
      reason: 'Dream Line Premium',
      external_reference: 'test_B:premium',
      payer_email: ACCOUNT_EMAIL,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 24.90,
        currency_id: 'BRL',
      },
      back_url: 'https://frontend-dream-line.vercel.app/payment-success',
      status: 'pending',
    };
    console.log('Body:', JSON.stringify(bodyB, null, 2));
    const rB = await axios.post(`${MP_API_URL}/preapproval`, bodyB, { headers: getHeaders() });
    console.log('✅ Resposta:', JSON.stringify(rB.data, null, 2));
    console.log('✅ Init Point:', rB.data.init_point);
  } catch (e) {
    console.log('❌ Erro:', JSON.stringify(e.response?.data || e.message, null, 2));
  }

  // Test C: Create subscription WITH plan_id + user email (pending)
  console.log('\n--- TESTE C: Subscription com plan_id + user email (pending) ---');
  try {
    const bodyC = {
      preapproval_plan_id: PLAN_ID,
      external_reference: 'test_C:premium',
      payer_email: 'denisbuarque@gmail.com',
      reason: 'Dream Line Premium',
      back_url: 'https://frontend-dream-line.vercel.app/payment-success',
      status: 'pending',
    };
    console.log('Body:', JSON.stringify(bodyC, null, 2));
    const rC = await axios.post(`${MP_API_URL}/preapproval`, bodyC, { headers: getHeaders() });
    console.log('✅ Resposta:', JSON.stringify(rC.data, null, 2));
    console.log('✅ Init Point:', rC.data.init_point);
  } catch (e) {
    console.log('❌ Erro:', JSON.stringify(e.response?.data || e.message, null, 2));
  }
}

run();
