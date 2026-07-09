const mongoose = require('mongoose');
const UserMemory = require('../models/UserMemory');
const MemoryFact = require('../models/MemoryFact');
const ChatMessage = require('../models/ChatMessage');

async function checkMemorySystem(userId) {
  const results = {
    userMemory: null,
    memoryFacts: null,
    contextVersion: null,
    chatMessageMetadata: null,
    indexes: null,
  };

  try {
    const memory = await UserMemory.findOne({ userId }).lean();
    results.userMemory = {
      exists: !!memory,
      fields: memory ? Object.keys(memory).filter(k => k !== '_id' && k !== '__v') : [],
      totalDreams: memory?.stats?.totalDreams || 0,
      totalEmotions: memory?.stats?.totalEmotions || 0,
      lastUpdated: memory?.lastUpdated || null,
    };
  } catch (err) {
    results.userMemory = { error: err.message };
  }

  try {
    const factCount = await MemoryFact.countDocuments({ userId });
    const activeCount = await MemoryFact.countDocuments({ userId, isActive: true });
    const topFacts = await MemoryFact.find({ userId, isActive: true })
      .sort({ importanceScore: -1 })
      .limit(5)
      .select('category fact importanceScore')
      .lean();
    results.memoryFacts = {
      total: factCount,
      active: activeCount,
      categories: [...new Set(topFacts.map(f => f.category))],
      sampleFacts: topFacts,
    };
  } catch (err) {
    results.memoryFacts = { error: err.message };
  }

  try {
    const sampleMessage = await ChatMessage.findOne({ userId })
      .sort({ createdAt: -1 })
      .select('contextVersion')
      .lean();
    results.contextVersion = {
      latestVersion: sampleMessage?.contextVersion || 'no messages',
    };
  } catch (err) {
    results.contextVersion = { error: err.message };
  }

  try {
    const lastMessage = await ChatMessage.findOne({ userId })
      .sort({ createdAt: -1 })
      .select('promptTokens completionTokens latency')
      .lean();
    results.chatMessageMetadata = {
      lastPromptTokens: lastMessage?.promptTokens || null,
      lastCompletionTokens: lastMessage?.completionTokens || null,
      lastLatency: lastMessage?.latency || null,
    };
  } catch (err) {
    results.chatMessageMetadata = { error: err.message };
  }

  try {
    const collections = ['usermemories', 'memoryfacts', 'chatmessages'];
    const indexInfo = {};
    for (const name of collections) {
      try {
        const indexes = await mongoose.connection.db.collection(name).indexes();
        indexInfo[name] = indexes.map(i => ({
          name: i.name,
          key: i.key,
          unique: i.unique || false,
        }));
      } catch {
        indexInfo[name] = 'collection not found';
      }
    }
    results.indexes = indexInfo;
  } catch (err) {
    results.indexes = { error: err.message };
  }

  return results;
}

module.exports = { checkMemorySystem };
