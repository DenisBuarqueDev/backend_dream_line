require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');

const MP_API_URL = 'https://api.mercadopago.com';
const TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function run() {
  console.log('=== TESTE FINAL: Preapproval sem plan_id + email normal ===\n');

  const body = {
    reason: 'Dream Line Premium',
    external_reference: 'user_67890:premium',
    payer_email: 'denisbuarque@gmail.com',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 24.90,
      currency_id: 'BRL',
    },
    back_url: 'https://frontend-dream-line.vercel.app/payment-success',
    status: 'pending',
  };

  console.log('Body:', JSON.stringify(body, null, 2), '\n');

  try {
    const response = await axios.post(`${MP_API_URL}/preapproval`, body, { headers });
    console.log('✅ SUCESSO!\n');
    console.log('Status:', response.status);
    console.log('Subscription ID:', response.data.id);
    console.log('Status:', response.data.status);
    console.log('Init Point:', response.data.init_point);
    console.log('\nResposta completa:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (e) {
    console.log('❌ Erro:');
    if (e.response) {
      console.log('Status:', e.response.status);
      console.log('Dados:', JSON.stringify(e.response.data, null, 2));
    } else {
      console.log(e.message);
    }
    return null;
  }
}

run().then(r => {
  if (r) {
    console.log('\n✅ TESTE CONCLUÍDO - Assinatura recorrente funcionando!');
    process.exit(0);
  } else {
    console.log('\n❌ TESTE FALHOU');
    process.exit(1);
  }
});
