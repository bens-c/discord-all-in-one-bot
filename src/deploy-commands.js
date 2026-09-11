import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commandDefinitions } from './commands.js';

const required = ['DISCORD_TOKEN', 'CLIENT_ID'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const route = process.env.GUILD_ID
  ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
  : Routes.applicationCommands(process.env.CLIENT_ID);

await new REST({ version: '10' })
  .setToken(process.env.DISCORD_TOKEN)
  .put(route, { body: commandDefinitions });

console.log(`Deployed ${commandDefinitions.length} slash commands.`);
