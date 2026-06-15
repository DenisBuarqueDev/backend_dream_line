require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Dream = require('../models/Dream');
const { categorizeDream } = require('../services/dreamCategorizationService');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log(`📦 Conectado ao MongoDB: ${MONGODB_URI}`);

  const uncategorized = await Dream.find({
    $or: [
      { dreamCategory: { $exists: false } },
      { dreamCategory: 'Outros' },
    ]
  }).sort({ createdAt: -1 });

  console.log(`📊 ${uncategorized.length} sonhos para categorizar`);

  let done = 0;
  for (const dream of uncategorized) {
    if (!dream.textoSonho) {
      dream.dreamCategory = 'Outros';
      await dream.save();
      done++;
      continue;
    }

    const text = dream.textoSonho;
    const category = await categorizeDream(text);
    dream.dreamCategory = category;
    await dream.save();
    done++;
    console.log(`  [${done}/${uncategorized.length}] #${dream._id} → ${category}`);

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`✅ ${done} sonhos categorizados`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
