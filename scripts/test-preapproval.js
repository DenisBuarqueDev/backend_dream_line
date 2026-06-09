require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');

const MP_API_URL = 'https://api.mercadopago.com';
const TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('MERCADOPAGO_ACCESS_TOKEN não encontrado');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function testPreapproval() {
  const amount = parseFloat(process.env.MERCADOPAGO_PREMIUM_AMOUNT || '24.90');
  const backUrl = process.env.FRONTEND_URL || 'https://frontend-dream-line.vercel.app';

  const body = {
    reason: 'Dream Line Premium - Teste',
    external_reference: 'test_user_123:premium',
    payer_email: 'test_user_123@testuser.com',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: amount,
      currency_id: 'BRL',
    },
    back_url: backUrl + '/payment-success',
    status: 'pending',
  };

  console.log('=== TESTE: Criação de Preapproval (Assinatura) ===\n');
  console.log('URL:', `${MP_API_URL}/preapproval`);
  console.log('Headers:', { Authorization: `Bearer ${TOKEN.substring(0, 20)}...`, 'Content-Type': 'application/json' });
  console.log('\nBody:', JSON.stringify(body, null, 2), '\n');

  try {
    const response = await axios.post(`${MP_API_URL}/preapproval`, body, { headers });
    console.log('✅ SUCESSO!\n');
    console.log('Status:', response.status);
    console.log('\nResposta completa:', JSON.stringify(response.data, null, 2));
    console.log('\n=== DADOS IMPORTANTES ===');
    console.log('Subscription ID:', response.data.id);
    console.log('Status:', response.data.status);
    console.log('Init Point:', response.data.init_point);
    console.log('========================\n');
    return response.data;
  } catch (error) {
    console.log('❌ ERRO!\n');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.log('\nDados do erro:', JSON.stringify(error.response.data, null, 2));
      console.log('\nMensagem:', error.response.data?.message || error.message);
    } else {
      console.log('Erro sem response:', error.message);
    }
    return null;
  }
}

testPreapproval().then((data) => {
  if (data) {
    console.log('\nTeste concluído com sucesso!');
  } else {
    console.log('\nTeste falhou.');
    process.exit(1);
  }
});
