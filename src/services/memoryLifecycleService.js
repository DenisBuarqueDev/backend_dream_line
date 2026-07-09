const MemoryFact = require('../models/MemoryFact');

const PROTECTED_CATEGORIES = ['Saúde', 'Família', 'Trabalho', 'Objetivos', 'Sono'];
const DAYS_TO_REDUCE = 60;
const DAYS_TO_INACTIVE = 90;
const DAYS_TO_ARCHIVE = 180;
const SCORE_REDUCTION = 5;
const INACTIVE_THRESHOLD = 30;

async function reactivate(userId, factText) {
  try {
    const existing = await MemoryFact.findOne({
      userId,
      fact: factText,
      lifecycleStatus: { $in: ['inactive', 'archived'] },
    });
    if (existing) {
      const importance = calculateScore(existing.confidence, existing.occurrences + 1, new Date());
      await MemoryFact.findByIdAndUpdate(existing._id, {
        $set: {
          isActive: true,
          lifecycleStatus: 'active',
          lastSeen: new Date(),
          importanceScore: importance,
        },
        $inc: { occurrences: 1 },
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[MemoryLifecycle] reactivate error: ${err.message}`);
    return false;
  }
}

async function run() {
  try {
    const now = new Date();
    const reductionDate = new Date(now.getTime() - DAYS_TO_REDUCE * 86400000);
    const inactiveDate = new Date(now.getTime() - DAYS_TO_INACTIVE * 86400000);
    const archiveDate = new Date(now.getTime() - DAYS_TO_ARCHIVE * 86400000);

    let processed = 0;

    const activeFacts = await MemoryFact.find({
      lifecycleStatus: { $in: ['active', 'inactive'] },
    }).lean();

    for (const fact of activeFacts) {
      if (PROTECTED_CATEGORIES.includes(fact.category) && fact.lifecycleStatus !== 'protected') {
        await MemoryFact.findByIdAndUpdate(fact._id, {
          $set: { lifecycleStatus: 'protected' },
        });
        processed++;
        continue;
      }

      if (fact.lastSeen && fact.lastSeen < archiveDate && fact.importanceScore < INACTIVE_THRESHOLD) {
        await MemoryFact.findByIdAndUpdate(fact._id, {
          $set: { lifecycleStatus: 'archived', isActive: false },
        });
        processed++;
        continue;
      }

      if (fact.lastSeen && fact.lastSeen < inactiveDate && fact.importanceScore < INACTIVE_THRESHOLD) {
        await MemoryFact.findByIdAndUpdate(fact._id, {
          $set: { lifecycleStatus: 'inactive', isActive: false },
        });
        processed++;
        continue;
      }

      if (fact.lastSeen && fact.lastSeen < reductionDate && fact.importanceScore > 0 && fact.lifecycleStatus !== 'protected') {
        const newScore = Math.max(0, fact.importanceScore - SCORE_REDUCTION);
        await MemoryFact.findByIdAndUpdate(fact._id, {
          $set: { importanceScore: newScore },
        });
        processed++;
      }
    }

    console.log(`[MemoryLifecycle] run complete — processed=${processed}`);
  } catch (err) {
    console.error(`[MemoryLifecycle] run error: ${err.message}`);
  }
}

function calculateScore(confidence, occurrences, lastSeen) {
  const daysSinceLastSeen = Math.max(0, (new Date() - new Date(lastSeen).getTime()) / 86400000);
  const recencyScore = Math.max(0, 100 - daysSinceLastSeen * 1.5);
  const occurrenceScore = Math.min(100, occurrences * 15);
  return Math.round(confidence * 0.35 + occurrenceScore * 0.35 + recencyScore * 0.30);
}

module.exports = { run, reactivate };
