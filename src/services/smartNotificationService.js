const DailyCompanion = require('../models/DailyCompanion');

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function scheduleTime(priority) {
  const now = Date.now();
  const delays = { critical: 0, high: 30000, medium: 120000, low: 300000 };
  const delay = delays[priority] !== undefined ? delays[priority] : 120000;
  return new Date(now + delay).toISOString();
}

function queueLabel(priority) {
  return { critical: 'imediata', high: 'prioritária', medium: 'normal', low: 'baixa' }[priority] || 'normal';
}

function buildQueue(messages) {
  const queue = { imediata: [], prioritária: [], normal: [], baixa: [], raw: [] };

  for (const msg of messages) {
    const item = {
      userId: msg.userId,
      dailyCompanionId: msg._id,
      title: msg.title,
      message: msg.message,
      priority: msg.priority,
      scheduledFor: scheduleTime(msg.priority),
      category: msg.category,
    };

    queue.raw.push(item);

    switch (msg.priority) {
      case 'critical':
        queue.imediata.push(item);
        break;
      case 'high':
        queue.prioritária.push(item);
        break;
      case 'medium':
        queue.normal.push(item);
        break;
      case 'low':
        queue.baixa.push(item);
        break;
      default:
        queue.normal.push(item);
    }
  }

  return queue;
}

async function generateNotificationQueue() {
  const start = Date.now();

  try {
    const messages = await DailyCompanion.find({
      date: todayStr(),
      delivered: false,
      dismissed: false,
    }).lean();

    const totalFound = messages.length;
    const queue = buildQueue(messages);
    const prepared = queue.raw.length;
    const ignored = 0;

    const elapsed = Date.now() - start;

    console.log('');
    console.log('[Notification Engine]');
    console.log(`Mensagens encontradas: ${totalFound}`);
    console.log(`Preparadas: ${prepared}`);
    console.log(`Ignoradas: ${ignored}`);
    console.log(`Tempo: ${elapsed} ms`);
    console.log('');

    return queue;
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error('[Notification Engine] generateNotificationQueue error:', err.message);
    return { imediata: [], prioritária: [], normal: [], baixa: [], raw: [] };
  }
}

function prepareNotification(item) {
  if (!item) return null;

  return {
    userId: item.userId,
    notification: {
      title: item.title,
      body: item.message,
    },
    data: {
      type: 'daily_companion',
      dailyCompanionId: String(item.dailyCompanionId),
      category: item.category,
      priority: item.priority,
    },
    android: {
      channelId: 'daily_companion',
      priority: item.priority === 'critical' ? 'high' : 'default',
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: item.title,
            body: item.message,
          },
          sound: 'default',
          badge: 1,
        },
      },
    },
    webpush: {
      notification: {
        title: item.title,
        body: item.message,
        requireInteraction: item.priority === 'critical' || item.priority === 'high',
      },
    },
  };
}

async function markDelivered(id) {
  try {
    return await DailyCompanion.findByIdAndUpdate(
      id,
      { $set: { delivered: true } },
      { new: true },
    ).lean();
  } catch (err) {
    console.error('[Notification Engine] markDelivered error:', err.message);
    return null;
  }
}

async function markFailed(id, reason) {
  try {
    const msg = await DailyCompanion.findById(id).lean();
    if (!msg) return null;

    const failures = msg.metadata?.failedAttempts || [];

    return await DailyCompanion.findByIdAndUpdate(
      id,
      {
        $set: {
          'metadata.failedAttempts': [
            ...failures,
            { timestamp: new Date().toISOString(), reason: reason || 'unknown' },
          ],
        },
      },
      { new: true },
    ).lean();
  } catch (err) {
    console.error('[Notification Engine] markFailed error:', err.message);
    return null;
  }
}

module.exports = { generateNotificationQueue, prepareNotification, markDelivered, markFailed };
