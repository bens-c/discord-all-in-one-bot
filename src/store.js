import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MongoClient } from 'mongodb';

const dataPath = path.resolve('data', 'bot-data.json');
let mongoClient;
let collection;
let localData = { guilds: {} };
let writeQueue = Promise.resolve();

function defaults(guildId) {
  return {
    _id: guildId,
    config: { welcomeEnabled: false, welcomeChannelId: null, logChannelId: null, autoroleId: null, ticketCategoryId: null, supportRoleId: null, antiinvite: false, antispam: true },
    warnings: {}, economy: {}, levels: {}, giveaways: {},
  };
}

function normalize(guildId, state = {}) {
  const base = defaults(guildId);
  return { ...base, ...state, config: { ...base.config, ...(state.config || {}) }, warnings: state.warnings || {}, economy: state.economy || {}, levels: state.levels || {}, giveaways: state.giveaways || {} };
}

async function persistLocal() {
  writeQueue = writeQueue.then(async () => {
    await mkdir(path.dirname(dataPath), { recursive: true });
    await writeFile(dataPath, JSON.stringify(localData, null, 2));
  });
  return writeQueue;
}

export async function connectStore() {
  if (process.env.MONGODB_URI) {
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    collection = mongoClient.db(process.env.MONGODB_DB || 'kyrox_bot').collection('guild_state');
    console.log('MongoDB connected.');
    return;
  }
  try { localData = JSON.parse(await readFile(dataPath, 'utf8')); } catch { await persistLocal(); }
  console.warn('MONGODB_URI is empty; using local data/bot-data.json storage.');
}

export async function getGuildState(guildId) {
  if (collection) return normalize(guildId, await collection.findOne({ _id: guildId }));
  return normalize(guildId, localData.guilds[guildId]);
}

export async function mutateGuildState(guildId, mutate) {
  const state = await getGuildState(guildId);
  const result = await mutate(state);
  if (collection) await collection.replaceOne({ _id: guildId }, state, { upsert: true });
  else { localData.guilds[guildId] = state; await persistLocal(); }
  return result;
}

export async function listGuildStates() {
  if (collection) return (await collection.find({}).toArray()).map((state) => normalize(state._id, state));
  return Object.entries(localData.guilds).map(([id, state]) => normalize(id, state));
}

export async function closeStore() { await mongoClient?.close(); }
