require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');

const MP_API_URL = 'https://api.mercadopago.com';
const TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function diag() {
  console.log('========================================');
  console.log('  DIAGNÓSTICO MERCADO PAGO - ASSINATURAS');
  console.log('========================================\n');

  // 1. Conta
  console.log('[1] CONTA MP');
  try {
    const me = await axios.get(`${MP_API_URL}/users/me`, { headers });
    console.log('  Collector ID: ' + me.data.id);
    console.log('  Email: ' + me.data.email);
    console.log('  Site: ' + me.data.site);
  } catch (e) {
    console.log('  ERRO: ' + (e.response?.data?.message || e.message));
  }

  // 2. ENV
  console.log('\n[2] CONFIG (.env)');
  console.log('  PLAN_ID: ' + (process.env.MERCADOPAGO_PREMIUM_PLAN_ID || 'AUSENTE'));
  console.log('  AMOUNT: ' + process.env.MERCADOPAGO_PREMIUM_AMOUNT);
  console.log('  TOKEN: ' + TOKEN?.substring(0, 20) + '... (' + (TOKEN?.startsWith('APP_USR') ? 'PRODUÇÃO' : 'TEST') + ')');
  console.log('  FRONTEND_URL: ' + process.env.FRONTEND_URL);
  console.log('  WEBHOOK_SECRET: ' + (process.env.MERCADOPAGO_WEBHOOK_SECRET ? 'OK' : 'FALTA'));

  // 3. GET plan
  console.log('\n[3] VERIFICAR PLANO');
  const planId = process.env.MERCADOPAGO_PREMIUM_PLAN_ID;
  if (planId) {
    try {
      const plan = await axios.get(`${MP_API_URL}/preapproval_plan/${planId}`, { headers });
      console.log('  Status: ' + plan.data.status);
      console.log('  Reason: ' + plan.data.reason);
      console.log('  Valor: ' + plan.data.auto_recurring?.transaction_amount + ' ' + plan.data.auto_recurring?.currency_id);
      console.log('  Plan init_point: ' + plan.data.init_point);
    } catch (e) {
      console.log('  ERRO: ' + (e.response?.data?.message || e.message));
    }
  } else {
    console.log('  PLAN_ID não configurado');
  }

  // 4. TEST /preapproval SEM plano + email normal
  console.log('\n[4] PREAPPROVAL (sem plano, email normal)');
  console.log('  POST /preapproval');
  try {
    await axios.post(`${MP_API_URL}/preapproval`, {
      reason: 'Test',
      external_reference: 'diag:premium',
      payer_email: 'usuario@exemplo.com.br',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: 24.90, currency_id: 'BRL' },
      back_url: process.env.FRONTEND_URL + '/payment-success',
      status: 'pending',
    }, { headers });
    console.log('  ✅ SUCESSO (inesperado)');
  } catch (e) {
    console.log('  ❌ Status: ' + e.response?.status);
    console.log('  Mensagem: ' + e.response?.data?.message);
    console.log('  Causa: ' + JSON.stringify(e.response?.data?.cause));
  }

  // 5. TEST /preapproval COM plano + card_token mock
  console.log('\n[5] PREAPPROVAL (com plano, card_token mock)');
  console.log('  POST /preapproval');
  try {
    await axios.post(`${MP_API_URL}/preapproval`, {
      preapproval_plan_id: planId,
      reason: 'Test',
      external_reference: 'diag2:premium',
      payer_email: 'usuario@exemplo.com.br',
      card_token_id: 'mock_token_12345678901234567890123456789012',
      back_url: process.env.FRONTEND_URL + '/payment-success',
      status: 'authorized',
    }, { headers });
    console.log('  ✅ SUCESSO (inesperado)');
  } catch (e) {
    console.log('  ❌ Status: ' + e.response?.status);
    console.log('  Mensagem: ' + e.response?.data?.message);
  }

  // 6. TEST Checkout Pro
  console.log('\n[6] CHECKOUT PRO (fallback)');
  console.log('  POST /checkout/preferences');
  try {
    const r = await axios.post(`${MP_API_URL}/checkout/preferences`, {
      items: [{ title: 'Test', quantity: 1, currency_id: 'BRL', unit_price: 24.90 }],
      external_reference: 'diag3:premium',
      back_urls: { success: process.env.FRONTEND_URL + '/payment-success', failure: process.env.FRONTEND_URL, pending: process.env.FRONTEND_URL },
      auto_return: 'approved',
      payer: { email: 'usuario@exemplo.com.br' },
    }, { headers });
    console.log('  ✅ SUCESSO');
    console.log('  Preference ID: ' + r.data.id);
    console.log('  Init Point: ' + r.data.init_point);
  } catch (e) {
    console.log('  ❌ Status: ' + e.response?.status);
    console.log('  Mensagem: ' + e.response?.data?.message);
  }

  // SUMMARY
  console.log('\n========================================');
  console.log('  RESUMO DO DIAGNÓSTICO');
  console.log('========================================\n');
  console.log('Fluxo atual (código modificado):');
  console.log('  Pricing.jsx (CardForm)');
  console.log('    ↓ cardTokenId');
  console.log('  POST /api/subscription/subscribe');
  console.log('    ↓');
  console.log('  createPremiumSubscription()');
  console.log('    ├─ cardTokenId + planId → POST /preapproval (RECORRENTE)');
  console.log('    └─ senão → POST /checkout/preferences (FALLBACK, ÚNICO)\n');
  console.log('Erros encontrados nos testes:');
  console.log('  1. /preapproval sem plano:');
  console.log('     → "Both payer and collector must be real or test users"');
  console.log('     → Causa: payer_email não é usuário MP registrado');
  console.log('  2. /preapproval com plano:');
  console.log('     → "card_token_id is required" (quando sem token)');
  console.log('     → "Card token service bad request" (quando token mock)');
  console.log('     → Causa: plano requer token de cartão válido');
  console.log('  3. /checkout/preferences:');
  console.log('     → FUNCIONA, mas é pagamento ÚNICO, não recorrente\n');
  console.log('Classificação do problema:');
  console.log('  Categoria: G) ARQUITETURA INCORRETA');
  console.log('  Sub-categoria: API errada para o caso de uso');
  console.log('  Detalhe:');
  console.log('  - /checkout/preferences (Checkout Pro) = pagamento único, sem recorrência');
  console.log('  - /preapproval = assinatura recorrente, mas exige card_token_id');
  console.log('  - Solução: CardForm → card_token_id → /preapproval (já implementado)');
  process.exit(0);
}

diag();
