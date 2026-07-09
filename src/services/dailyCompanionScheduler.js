const User = require('../models/User');
const DailyCompanion = require('../models/DailyCompanion');
const { generateDailyMessage } = require('./dailyCompanionService');

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function countTodayMessages() {
  try {
    return await DailyCompanion.countDocuments({ date: todayStr() });
  } catch (err) {
    console.error('[DailyCompanionScheduler] countTodayMessages error:', err.message);
    return 0;
  }
}

async function generateDailyMessages() {
  const start = Date.now();
  let generated = 0;
  let ignored = 0;
  let errors = 0;

  try {
    const users = await User.find({ emailVerified: true }).select('_id').lean();
    const total = users.length;

    for (const user of users) {
      try {
        const existing = await DailyCompanion.findOne({ userId: user._id, date: todayStr() }).lean();
        if (existing) {
          ignored++;
          continue;
        }

        const result = await generateDailyMessage(user._id);
        if (result) {
          generated++;
        } else {
          errors++;
        }
      } catch (err) {
        errors++;
        console.error(`[DailyCompanionScheduler] Error for user ${user._id}:`, err.message);
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log('');
    console.log('[Daily Companion]');
    console.log(`Usuários: ${total}`);
    console.log(`Mensagens geradas: ${generated}`);
    console.log(`Ignorados: ${ignored}`);
    console.log(`Erros: ${errors}`);
    console.log(`Tempo: ${elapsed} segundos`);
    console.log('');

    return { total, generated, ignored, errors, elapsed: parseFloat(elapsed) };
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error('[DailyCompanionScheduler] generateDailyMessages error:', err.message);
    return { total: 0, generated: 0, ignored: 0, errors: 1, elapsed: parseFloat(elapsed) };
  }
}

function runScheduler() {
  console.log('[DailyCompanionScheduler] runScheduler called — ready for cron/BullMQ integration');
  return generateDailyMessages();
}

module.exports = { generateDailyMessages, runScheduler, countTodayMessages };
