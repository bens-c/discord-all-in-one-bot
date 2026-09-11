import 'dotenv/config';
import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';

if (!process.env.DISCORD_TOKEN) {
  throw new Error('DISCORD_TOKEN is required. Copy .env.example to .env and configure it locally.');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply({ content: `Pong! ${client.ws.ping}ms`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.commandName === 'clear') {
    if (!interaction.channel?.isTextBased() || !('bulkDelete' in interaction.channel)) {
      await interaction.reply({ content: 'This command only works in server text channels.', flags: MessageFlags.Ephemeral });
      return;
    }

    const amount = interaction.options.getInteger('amount', true);
    const deleted = await interaction.channel.bulkDelete(amount, true);
    await interaction.reply({ content: `Deleted ${deleted.size} messages.`, flags: MessageFlags.Ephemeral });
  }
});

client.on(Events.Error, console.error);
await client.login(process.env.DISCORD_TOKEN);
