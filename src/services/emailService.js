const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'denisprogramadorweb@gmail.com';

async function sendEmail({ to, subject, html }) {
  if (!SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY não configurada — e-mail não enviado');
    return false;
  }

  console.log(`📧 Enviando e-mail via SendGrid...`);
  console.log(`   From: ${FROM_EMAIL}`);
  console.log(`   To:   ${to}`);
  console.log(`   Subject: ${subject}`);

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ SendGrid respondeu com status ${response.status}:`);
      console.error(`   ${errorText}`);
      return false;
    }

    console.log(`✅ SendGrid: e-mail aceito (status ${response.status})`);
    return true;
  } catch (error) {
    console.error(`❌ SendGrid lançou exceção:`);
    console.error(`   message: ${error.message}`);
    return false;
  }
}

async function sendVerificationEmail(email, token) {
  const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://dream-line.vercel.app' : 'http://localhost:5173');
  const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

  console.log('🔗 Link de verificação:', verificationLink);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #0f0b1a; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #fff; font-size: 24px; margin: 0;">Dream Line</h1>
        <p style="color: #a78bfa; font-size: 14px; margin: 4px 0 0;">Verifique seu e-mail</p>
      </div>

      <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6;">Olá!</p>
      <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
        Obrigado por criar sua conta no Dream Line.
      </p>
      <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
        Clique no botão abaixo para ativar seu acesso:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${verificationLink}"
           style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #9333ea, #6366f1); color: #fff; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 600;">
          Verificar E-mail
        </a>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        Caso não tenha criado esta conta, ignore esta mensagem.
      </p>

      <hr style="border: none; border-top: 1px solid #1e1b2e; margin: 24px 0;" />

      <p style="color: #475569; font-size: 12px; text-align: center;">
        Dream Line — Ferramenta para entender sua mente.
      </p>
    </div>
  `;

  const sent = await sendEmail({
    to: email,
    subject: 'Verifique seu e-mail',
    html,
  });

  if (sent) {
    console.log('✅ E-mail de verificação enviado com sucesso para', email);
  } else {
    console.log('⚠️  Falha ao enviar e-mail — use o link acima manualmente');
  }

  return sent;
}

async function sendTestEmail(to) {
  console.log(`🧪 Enviando e-mail de teste para ${to}...`);

  const sent = await sendEmail({
    to,
    subject: 'Teste SMTP Dream Line',
    html: '<p>Se você recebeu este e-mail, o SMTP está funcionando.</p>',
  });

  console.log(`🧪 Resultado do teste: ${sent ? 'SUCESSO' : 'FALHA'}`);
  return sent;
}

module.exports = { sendVerificationEmail, sendTestEmail };
