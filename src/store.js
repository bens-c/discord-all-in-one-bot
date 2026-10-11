import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataPath = path.resolve('data', 'bot-data.json');
let localData = { guilds: {} };
let writeQueue = Promise.resolve();
const mutations = new Map();

function defaults(guildId) {
  return {
    _id: guildId,
    config: { welcomeEnabled: false, welcomeChannelId: null, logChannelId: null, autoroleId: null, ticketCategoryId: null, supportRoleId: null, antiinvite: false, antispam: true },
    warnings: {}, economy: {}, levels: {}, giveaways: {},
  };
}

function normalize(guildId, state = {}) {
  state ||= {};
  const base = defaults(guildId);
  return { ...base, ...state, config: { ...base.config, ...(state.config || {}) }, warnings: state.warnings || {}, economy: state.economy || {}, levels: state.levels || {}, giveaways: state.giveaways || {} };
}

async function persistLocal() {
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    await mkdir(path.dirname(dataPath), { recursive: true });
    await writeFile(`${dataPath}.tmp`, JSON.stringify(localData, null, 2), { mode: 0o600 });
    await rename(`${dataPath}.tmp`, dataPath);
  });
  return writeQueue;
}

export async function connectStore() {
  try {
    const data = JSON.parse(await readFile(dataPath, 'utf8'));
    if (!data || !data.guilds || typeof data.guilds !== 'object' || Array.isArray(data.guilds)) {
      throw new Error('Invalid local storage: expected a guilds object.');
    }
    localData = data;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await persistLocal();
  }
  console.warn('Using local data/bot-data.json storage.');
}

export async function getGuildState(guildId) {
  return normalize(guildId, localData.guilds[guildId]);
}

export async function mutateGuildState(guildId, mutate) {
  const previous = mutations.get(guildId) || Promise.resolve();
  const pending = previous.catch(() => {}).then(async () => {
    const state = structuredClone(await getGuildState(guildId));
    const result = await mutate(state);
    localData.guilds[guildId] = state;
    await persistLocal();
    return result;
  });
  mutations.set(guildId, pending);
  try { return await pending; }
  finally { if (mutations.get(guildId) === pending) mutations.delete(guildId); }
}

export async function listGuildStates() {
  return Object.entries(localData.guilds).map(([id, state]) => normalize(id, state));
}

export async function closeStore() {
  await Promise.allSettled([...mutations.values()]);
  await writeQueue;
}
