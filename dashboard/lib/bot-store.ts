import "server-only";
import { MongoClient } from "mongodb";

type GuildState = {
  _id: string;
  config: Record<string, boolean | string | null>;
  warnings: Record<string, { id: string; reason: string; moderatorId: string; createdAt: number }[]>;
  economy: Record<string, { wallet: number; bank: number; dailyAt: number; workAt: number }>;
  levels: Record<string, { xp: number; messages: number }>;
  giveaways: Record<string, unknown>;
};

const globalMongo = globalThis as typeof globalThis & { kyroxMongo?: Promise<MongoClient> };

function defaults(guildId: string): GuildState {
  return {
    _id: guildId,
    config: { welcomeEnabled: false, welcomeChannelId: null, logChannelId: null, autoroleId: null, ticketCategoryId: null, supportRoleId: null, antiinvite: false, antispam: true },
    warnings: {}, economy: {}, levels: {}, giveaways: {},
  };
}

async function collection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  globalMongo.kyroxMongo ||= new MongoClient(uri).connect();
  return (await globalMongo.kyroxMongo).db(process.env.MONGODB_DB || "kyrox_bot").collection<GuildState>("guild_state");
}

export async function getBotState(guildId: string) {
  const store = await collection();
  if (!store) return null;
  const state = await store.findOne({ _id: guildId });
  return { ...defaults(guildId), ...state, config: { ...defaults(guildId).config, ...(state?.config || {}) }, warnings: state?.warnings || {}, economy: state?.economy || {}, levels: state?.levels || {}, giveaways: state?.giveaways || {} };
}

export async function updateBotState(guildId: string, mutate: (state: GuildState) => void) {
  const store = await collection();
  if (!store) throw new Error("MongoDB is not configured for the dashboard.");
  const state = await getBotState(guildId) || defaults(guildId);
  mutate(state);
  await store.replaceOne({ _id: guildId }, state, { upsert: true });
  return state;
}
