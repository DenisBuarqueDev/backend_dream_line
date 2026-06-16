const admin = require('firebase-admin');

const parsePrivateKey = (key) => {
  if (!key) return '';
  return key
    .replace(/\\n/g, '\n')
    .replace(/"/g, '')
    .trim();
};

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
  try {
    admin.initializeApp({
      credential: admin.cert(serviceAccount),
    });
    console.log('🔥 Firebase Admin inicializado com sucesso');
  } catch (error) {
    console.error('⚠️ Firebase Admin falhou ao inicializar:', error.message);
    console.error('   Dica: verifique o formato de FIREBASE_PRIVATE_KEY no Render');
    console.error('   - Deve começar com -----BEGIN PRIVATE KEY-----');
    console.error('   - Não deve ter aspas extras no início/fim');
    console.error('   - \\n deve ser convertido para quebras de linha reais');
  }
} else {
  const missing = [];
  if (!serviceAccount.projectId) missing.push('FIREBASE_PROJECT_ID');
  if (!serviceAccount.privateKey) missing.push('FIREBASE_PRIVATE_KEY');
  if (!serviceAccount.clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
  console.warn('⚠️ Firebase Admin não configurado — variáveis ausentes:', missing.join(', '));
  console.warn('   Notificações push desabilitadas');
}

async function sendPush(token, title, body, data = {}) {
  if (!admin.apps.length) {
    console.warn('Firebase não configurado, pulando push');
    return { success: false, reason: 'firebase_not_configured' };
  }

  if (!token) {
    return { success: false, reason: 'no_token' };
  }

  const message = {
    token,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    webpush: {
      fcmOptions: {
        link: data?.link || '/dashboard',
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    if (error.code === 'messaging/registration-token-not-registered') {
      return { success: false, reason: 'token_not_registered', error: error.message };
    }
    if (error.code === 'messaging/invalid-argument') {
      return { success: false, reason: 'invalid_token', error: error.message };
    }
    return { success: false, reason: 'send_failed', error: error.message };
  }
}

async function sendMulticast(tokens, title, body, data = {}) {
  if (!admin.apps.length || !tokens.length) {
    return { success: false, reason: 'not_configured_or_no_tokens' };
  }

  const message = {
    tokens: tokens.filter(Boolean),
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    const invalidTokens = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (errCode === 'messaging/registration-token-not-registered' || errCode === 'messaging/invalid-argument') {
            invalidTokens.push(tokens[idx]);
          }
        }
      });
    }
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
    };
  } catch (error) {
    return { success: false, reason: 'multicast_failed', error: error.message };
  }
}

module.exports = { sendPush, sendMulticast };
