import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const commandDefinitions = [
  new SlashCommandBuilder().setName('ping').setDescription('Check whether the bot is online.'),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete recent messages from the current channel.')
    .addIntegerOption((option) =>
      option.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
].map((command) => command.toJSON());
