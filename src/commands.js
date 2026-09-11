import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

const reason = (option) => option.setName('reason').setDescription('Grund').setMaxLength(400);
const member = (option) => option.setName('member').setDescription('Mitglied').setRequired(true);

export const commandDefinitions = [
  new SlashCommandBuilder().setName('help').setDescription('Zeigt alle Bot-Befehle.'),
  new SlashCommandBuilder().setName('ping').setDescription('Prüft Status und Latenz des Bots.'),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Zeigt Informationen über den Server.'),
  new SlashCommandBuilder().setName('userinfo').setDescription('Zeigt Informationen über ein Mitglied.').addUserOption(member),
  new SlashCommandBuilder().setName('avatar').setDescription('Zeigt den Avatar eines Nutzers.').addUserOption((o) => o.setName('user').setDescription('Nutzer')),
  new SlashCommandBuilder().setName('clear').setDescription('Löscht Nachrichten im aktuellen Kanal.')
    .addIntegerOption((o) => o.setName('amount').setDescription('Anzahl (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName('kick').setDescription('Entfernt ein Mitglied vom Server.').addUserOption(member).addStringOption(reason)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder().setName('ban').setDescription('Bannt ein Mitglied.').addUserOption(member).addStringOption(reason)
    .addIntegerOption((o) => o.setName('delete_days').setDescription('Nachrichten der letzten Tage löschen').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName('unban').setDescription('Hebt einen Bann per Nutzer-ID auf.')
    .addStringOption((o) => o.setName('user_id').setDescription('Discord Nutzer-ID').setRequired(true)).addStringOption(reason)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName('timeout').setDescription('Versetzt ein Mitglied in einen Timeout.').addUserOption(member)
    .addIntegerOption((o) => o.setName('minutes').setDescription('Dauer in Minuten').setRequired(true).setMinValue(1).setMaxValue(40320)).addStringOption(reason)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('untimeout').setDescription('Entfernt den Timeout eines Mitglieds.').addUserOption(member).addStringOption(reason)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('warn').setDescription('Verwarnungen verwalten.')
    .addSubcommand((s) => s.setName('add').setDescription('Verwarnung hinzufügen').addUserOption(member).addStringOption((o) => reason(o).setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('Verwarnungen anzeigen').addUserOption(member))
    .addSubcommand((s) => s.setName('remove').setDescription('Verwarnung entfernen').addUserOption(member).addStringOption((o) => o.setName('id').setDescription('Warnungs-ID').setRequired(true)))
    .addSubcommand((s) => s.setName('clear').setDescription('Alle Verwarnungen entfernen').addUserOption(member))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('lock').setDescription('Sperrt den aktuellen Textkanal.').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('unlock').setDescription('Entsperrt den aktuellen Textkanal.').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('slowmode').setDescription('Setzt den Slowmode des aktuellen Kanals.')
    .addIntegerOption((o) => o.setName('seconds').setDescription('Sekunden (0 deaktiviert)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('role').setDescription('Rollen eines Mitglieds verwalten.')
    .addSubcommand((s) => s.setName('add').setDescription('Rolle hinzufügen').addUserOption(member).addRoleOption((o) => o.setName('role').setDescription('Rolle').setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription('Rolle entfernen').addUserOption(member).addRoleOption((o) => o.setName('role').setDescription('Rolle').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder().setName('nick').setDescription('Ändert den Nicknamen eines Mitglieds.').addUserOption(member)
    .addStringOption((o) => o.setName('nickname').setDescription('Neuer Nickname; leer zum Zurücksetzen').setMaxLength(32))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
  new SlashCommandBuilder().setName('ticket').setDescription('Tickets verwalten.')
    .addSubcommand((s) => s.setName('setup').setDescription('Ticket-System konfigurieren')
      .addChannelOption((o) => o.setName('category').setDescription('Ticket-Kategorie').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
      .addRoleOption((o) => o.setName('support_role').setDescription('Support-Rolle').setRequired(true)))
    .addSubcommand((s) => s.setName('open').setDescription('Neues Support-Ticket öffnen').addStringOption((o) => o.setName('topic').setDescription('Anliegen').setMaxLength(200)))
    .addSubcommand((s) => s.setName('close').setDescription('Aktuelles Ticket schließen').addStringOption(reason))
    .addSubcommand((s) => s.setName('add').setDescription('Mitglied zum Ticket hinzufügen').addUserOption(member))
    .addSubcommand((s) => s.setName('remove').setDescription('Mitglied aus Ticket entfernen').addUserOption(member)),
  new SlashCommandBuilder().setName('balance').setDescription('Zeigt den Kontostand.').addUserOption((o) => o.setName('user').setDescription('Nutzer')),
  new SlashCommandBuilder().setName('daily').setDescription('Holt die tägliche Belohnung ab.'),
  new SlashCommandBuilder().setName('work').setDescription('Arbeitet für Coins.'),
  new SlashCommandBuilder().setName('pay').setDescription('Überweist Coins an ein Mitglied.').addUserOption(member)
    .addIntegerOption((o) => o.setName('amount').setDescription('Betrag').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Zeigt eine Rangliste.')
    .addStringOption((o) => o.setName('type').setDescription('Ranglisten-Typ').setRequired(true).addChoices({ name: 'Economy', value: 'economy' }, { name: 'Level', value: 'level' })),
  new SlashCommandBuilder().setName('rank').setDescription('Zeigt Level und XP.').addUserOption((o) => o.setName('user').setDescription('Nutzer')),
  new SlashCommandBuilder().setName('giveaway').setDescription('Gewinnspiele verwalten.')
    .addSubcommand((s) => s.setName('start').setDescription('Gewinnspiel starten').addStringOption((o) => o.setName('prize').setDescription('Preis').setRequired(true).setMaxLength(200))
      .addIntegerOption((o) => o.setName('minutes').setDescription('Dauer in Minuten').setRequired(true).setMinValue(1).setMaxValue(10080))
      .addIntegerOption((o) => o.setName('winners').setDescription('Anzahl Gewinner').setMinValue(1).setMaxValue(20)))
    .addSubcommand((s) => s.setName('end').setDescription('Gewinnspiel sofort beenden').addStringOption((o) => o.setName('message_id').setDescription('Nachrichten-ID').setRequired(true)))
    .addSubcommand((s) => s.setName('reroll').setDescription('Neue Gewinner ziehen').addStringOption((o) => o.setName('message_id').setDescription('Nachrichten-ID').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  new SlashCommandBuilder().setName('config').setDescription('Server-Konfiguration verwalten.')
    .addSubcommand((s) => s.setName('show').setDescription('Aktuelle Konfiguration anzeigen'))
    .addSubcommand((s) => s.setName('welcome').setDescription('Willkommensnachrichten konfigurieren').addBooleanOption((o) => o.setName('enabled').setDescription('Aktivieren/deaktivieren').setRequired(true))
      .addChannelOption((o) => o.setName('channel').setDescription('Willkommenskanal').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((s) => s.setName('logs').setDescription('Modlog-Kanal konfigurieren').addChannelOption((o) => o.setName('channel').setDescription('Log-Kanal').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('autorole').setDescription('Automatische Rolle konfigurieren').addRoleOption((o) => o.setName('role').setDescription('Rolle').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('security').setDescription('Sicherheitsfunktionen verwalten.')
    .addSubcommand((s) => s.setName('show').setDescription('Sicherheitseinstellungen anzeigen'))
    .addSubcommand((s) => s.setName('antiinvite').setDescription('Discord-Einladungen blockieren').addBooleanOption((o) => o.setName('enabled').setDescription('Status').setRequired(true)))
    .addSubcommand((s) => s.setName('antispam').setDescription('Spam-Schutz aktivieren').addBooleanOption((o) => o.setName('enabled').setDescription('Status').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map((command) => command.toJSON());
