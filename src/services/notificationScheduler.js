const cron = require('node-cron');
const User = require('../models/User');
const { sendPush } = require('./firebaseService');

const MESSAGES = {
  '07:00': {
    title: '🌙 Bom dia!',
    body: 'Você lembra do sonho desta noite? Registre agora antes que ele desapareça.',
    link: '/dashboard',
  },
  '21:00': {
    title: '✨ Boa noite!',
    body: 'Prepare-se para uma nova noite de sonhos. Tenha um ótimo descanso!',
    link: '/sleep',
  },
};

async function checkAndSendNotifications() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const message = MESSAGES[currentTime];
  if (!message) return;

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const users = await User.find({
    notificationsEnabled: true,
    fcmToken: { $ne: null },
    $or: [
      { lastNotificationSent: null },
      { lastNotificationSent: { $lt: oneHourAgo } },
    ],
  });

  for (const user of users) {
    const result = await sendPush(user.fcmToken, message.title, message.body, { link: message.link });

    if (result.success) {
      user.lastNotificationSent = now;
      await user.save();
    } else if (result.reason === 'token_not_registered' || result.reason === 'invalid_token') {
      user.fcmToken = null;
      await user.save();
    }
  }
}

const scheduledJobs = [];

function startScheduler() {
  scheduledJobs.forEach(job => job.stop());
  scheduledJobs.length = 0;

  const job1 = cron.schedule('0 7 * * *', () => {
    console.log('[Notifications] Enviando notificações 07:00');
    checkAndSendNotifications().catch(err => console.error('[Notifications] Erro no job 07:00:', err.message));
  });

  const job2 = cron.schedule('0 21 * * *', () => {
    console.log('[Notifications] Enviando notificações 21:00');
    checkAndSendNotifications().catch(err => console.error('[Notifications] Erro no job 21:00:', err.message));
  });

  scheduledJobs.push(job1, job2);

  console.log('⏰ Agendador de notificações iniciado (07:00, 21:00)');
}

function stopScheduler() {
  scheduledJobs.forEach(job => job.stop());
  scheduledJobs.length = 0;
  console.log('⏰ Agendador de notificações parado');
}

module.exports = { startScheduler, stopScheduler, checkAndSendNotifications };
