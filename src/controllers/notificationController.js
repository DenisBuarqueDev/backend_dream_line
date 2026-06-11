const User = require('../models/User');
const { sendPush } = require('../services/firebaseService');

async function registerToken(req, res) {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token é obrigatório' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const existing = await User.findOne({ fcmToken: token, _id: { $ne: req.userId } });
    if (existing) {
      existing.fcmToken = null;
      await existing.save();
    }

    user.fcmToken = token;
    if (!user.notificationPrompted) {
      user.notificationPrompted = true;
    }
    await user.save();

    res.json({ message: 'Token registrado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar token', error: error.message });
  }
}

async function unregisterToken(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    user.fcmToken = null;
    await user.save();

    res.json({ message: 'Token removido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover token', error: error.message });
  }
}

async function updateSettings(req, res) {
  try {
    const { notificationsEnabled, notificationTimes, notificationPrompted } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (typeof notificationsEnabled === 'boolean') {
      user.notificationsEnabled = notificationsEnabled;
    }

    if (typeof notificationPrompted === 'boolean') {
      user.notificationPrompted = notificationPrompted;
    }

    if (notificationTimes && Array.isArray(notificationTimes)) {
      const valid = notificationTimes.every(t => /^\d{2}:\d{2}$/.test(t));
      if (!valid) {
        return res.status(400).json({ message: 'Horários devem estar no formato HH:mm' });
      }
      user.notificationTimes = notificationTimes;
    }

    await user.save();

    res.json({
      message: 'Configurações atualizadas',
      notificationsEnabled: user.notificationsEnabled,
      notificationTimes: user.notificationTimes,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar configurações', error: error.message });
  }
}

async function getSettings(req, res) {
  try {
    const user = await User.findById(req.userId).select('notificationsEnabled notificationTimes lastNotificationSent fcmToken notificationPrompted');
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({
      notificationsEnabled: user.notificationsEnabled,
      notificationTimes: user.notificationTimes,
      lastNotificationSent: user.lastNotificationSent,
      hasToken: !!user.fcmToken,
      notificationPrompted: user.notificationPrompted,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar configurações', error: error.message });
  }
}

async function sendTestNotification(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (!user.fcmToken) {
      return res.status(400).json({ message: 'Nenhum token FCM registrado' });
    }

    const result = await sendPush(
      user.fcmToken,
      '🔔 Dream Line',
      'Esta é uma notificação de teste!'
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao enviar notificação de teste', error: error.message });
  }
}

module.exports = { registerToken, unregisterToken, updateSettings, getSettings, sendTestNotification };
