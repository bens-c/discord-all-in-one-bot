import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { closeStore, connectStore } from './store.js';
import { handleButton, handleCommand, handleGuildMemberAdd, handleMessage, restoreGiveaways } from './handlers.js';

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required. Copy .env.example to .env and configure it locally.');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready as ${readyClient.user.tag} on ${readyClient.guilds.cache.size} guild(s).`);
  await restoreGiveaways(readyClient).catch(console.error);
  setInterval(() => restoreGiveaways(readyClient).catch(console.error), 60_000).unref();
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) await handleCommand(interaction);
    else if (interaction.isButton()) await handleButton(interaction);
  } catch (error) {
    console.error(`Interaction ${interaction.commandName || interaction.customId} failed:`, error);
    const payload = { content: 'Beim Ausführen ist ein Fehler aufgetreten.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
});

client.on(Events.MessageCreate, (message) => handleMessage(message).catch(console.error));
client.on(Events.GuildMemberAdd, (member) => handleGuildMemberAdd(member).catch(console.error));
client.on(Events.Error, console.error);

async function shutdown(signal) {
  console.log(`${signal} received, shutting down.`);
  client.destroy();
  await closeStore();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

await connectStore();
await client.login(process.env.DISCORD_TOKEN);
