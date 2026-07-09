const RelationshipMemory = require('../models/RelationshipMemory');

const PATTERNS = [
  { regex: /(?:minha\s+(?:esposa|mulher|companheira))\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Cônjuge' },
  { regex: /(?:meu\s+(?:marido|esposo|companheiro))\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Cônjuge' },
  { regex: /(?:meu\s+filho)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Filho' },
  { regex: /(?:minha\s+filha)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Filho' },
  { regex: /(?:meu\s+pai)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Pai' },
  { regex: /(?:minha\s+mãe)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Mãe' },
  { regex: /(?:meu\s+irmão)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Irmão' },
  { regex: /(?:minha\s+irmã)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Irmã' },
  { regex: /(?:meu\s+chefe)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Chefe' },
  { regex: /(?:minha\s+chefa)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Chefe' },
  { regex: /(?:meu\s+psicólogo)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Psicólogo' },
  { regex: /(?:minha\s+psicóloga)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Psicólogo' },
  { regex: /(?:meu\s+médico)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Médico' },
  { regex: /(?:minha\s+médica)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Médico' },
  { regex: /(?:meu\s+amigo)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Amigo' },
  { regex: /(?:minha\s+amiga)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Amigo' },
  { regex: /(?:meu\s+colega)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Colega' },
  { regex: /(?:minha\s+colega)\s+([A-ZÀ-Ú][a-zà-ú]+)/gi, rel: 'Colega' },
];

const RELATIONSHIP_KEYWORDS = {
  'esposa': 'Cônjuge', 'mulher': 'Cônjuge', 'marido': 'Cônjuge', 'esposo': 'Cônjuge',
  'companheira': 'Cônjuge', 'companheiro': 'Cônjuge', 'noiva': 'Cônjuge', 'noivo': 'Cônjuge',
  'namorada': 'Cônjuge', 'namorado': 'Cônjuge',
  'filho': 'Filho', 'filha': 'Filho', 'entead': 'Filho',
  'pai': 'Pai', 'mãe': 'Mãe', 'padrasto': 'Pai', 'madrasta': 'Mãe',
  'irmão': 'Irmão', 'irmã': 'Irmã',
  'tia': 'Família', 'tio': 'Família', 'primo': 'Família', 'prima': 'Família',
  'avó': 'Família', 'avô': 'Família', 'sogro': 'Família', 'sogra': 'Família',
  'cunhado': 'Família', 'cunhada': 'Família',
  'amigo': 'Amigo', 'amiga': 'Amigo',
  'colega': 'Colega', 'colega de trabalho': 'Colega',
  'chefe': 'Chefe', 'chefa': 'Chefe', 'supervisor': 'Chefe', 'supervisora': 'Chefe',
  'psicólogo': 'Psicólogo', 'psicóloga': 'Psicólogo', 'terapeuta': 'Psicólogo',
  'médico': 'Médico', 'médica': 'Médico', 'psiquiatra': 'Médico',
};

function extractRelationships(text) {
  if (!text) return [];
  const found = [];

  for (const { regex, rel } of PATTERNS) {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1].trim();
      if (name.length >= 2) {
        found.push({ name, relationship: rel });
      }
    }
  }

  const lower = text.toLowerCase();
  for (const [keyword, rel] of Object.entries(RELATIONSHIP_KEYWORDS)) {
    const kwLower = keyword.toLowerCase();
    if (lower.includes(kwLower)) {
      const regex = new RegExp(`${kwLower}\\s+([A-ZÀ-Ú][a-zà-ú]+)`, 'i');
      const match = regex.exec(text);
      if (match) {
        const name = match[1].trim();
        if (name.length >= 2 && !found.some(f => f.name === name)) {
          found.push({ name, relationship: rel });
        }
      }
    }
  }

  const unique = [];
  const seen = new Set();
  for (const item of found) {
    const key = `${item.name}|${item.relationship}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique;
}

async function update(userId, conversationId, question, answer) {
  try {
    const text = `${question || ''} ${answer || ''}`;
    const relationships = extractRelationships(text);

    if (relationships.length === 0) return;

    for (const rel of relationships) {
      const existing = await RelationshipMemory.findOne({ userId, name: rel.name });

      if (existing) {
        const daysSinceLastMention = existing.lastMention
          ? Math.floor((Date.now() - new Date(existing.lastMention).getTime()) / 86400000)
          : 999;

        const mentionBoost = Math.min(10, Math.round(10 / (1 + daysSinceLastMention)));
        const newImportance = Math.min(100, existing.importance + mentionBoost);
        const newEmotionalWeight = Math.min(100, existing.emotionalWeight + Math.round(mentionBoost * 0.5));

        await RelationshipMemory.updateOne(
          { _id: existing._id },
          {
            $set: {
              relationship: rel.relationship,
              lastMention: new Date(),
              importance: newImportance,
              emotionalWeight: newEmotionalWeight,
              isActive: true,
            },
            $inc: { mentionCount: 1 },
          },
        );
      } else {
        await RelationshipMemory.create({
          userId,
          name: rel.name,
          relationship: rel.relationship,
          importance: 30,
          emotionalWeight: 25,
          firstMention: new Date(),
          lastMention: new Date(),
          mentionCount: 1,
          currentStatus: 'Mencionado recentemente',
          isActive: true,
        });
      }
    }
  } catch (err) {
    if (err.code !== 11000) console.error('[RelationshipMemory] update error:', err.message);
  }
}

async function getImportantRelationships(userId) {
  try {
    const relationships = await RelationshipMemory.find({ userId, isActive: true })
      .sort({ importance: -1, emotionalWeight: -1, lastMention: -1 })
      .limit(5)
      .lean();

    return relationships.map(r => ({
      name: r.name,
      relationship: r.relationship,
      emotionalWeight: r.emotionalWeight,
      importance: r.importance,
      currentStatus: r.currentStatus,
      mentionCount: r.mentionCount,
      lastMention: r.lastMention,
    }));
  } catch (err) {
    console.error('[RelationshipMemory] getImportantRelationships error:', err.message);
    return [];
  }
}

module.exports = { update, getImportantRelationships };
