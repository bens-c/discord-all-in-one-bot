import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits,
} from 'discord.js';
import { getGuildState, listGuildStates, mutateGuildState } from './store.js';

const xpCooldown = new Map();
const spamTracker = new Map();
const giveawayTimers = new Map();
const invitePattern = /(discord\.gg|discord(?:app)?\.com\/invite)\/[a-z0-9-]+/i;
const coins = (value) => `${Number(value || 0).toLocaleString('de-DE')} 🪙`;
const unix = (date) => Math.floor(new Date(date).getTime() / 1000);

async function respond(interaction, content, ephemeral = true) {
  const payload = typeof content === 'string' ? { content } : content;
  if (ephemeral) payload.flags = MessageFlags.Ephemeral;
  return interaction.replied || interaction.deferred ? interaction.followUp(payload) : interaction.reply(payload);
}

async function getTargetMember(interaction) {
  const user = interaction.options.getUser('member', true);
  return interaction.guild.members.fetch(user.id);
}

async function modlog(guild, title, description, color = 0x5865f2) {
  const state = await getGuildState(guild.id);
  const channel = state.config.logChannelId && guild.channels.cache.get(state.config.logChannelId);
  if (channel?.isTextBased()) await channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp()] }).catch(() => {});
}

function economyUser(state, id) {
  return state.economy[id] ||= { wallet: 0, bank: 0, dailyAt: 0, workAt: 0 };
}

function levelUser(state, id) {
  return state.levels[id] ||= { xp: 0, messages: 0 };
}

function levelFromXp(xp) { return Math.floor(Math.sqrt(xp / 100)); }

function ticketOwner(channel) { return channel.topic?.match(/ticket-owner:(\d+)/)?.[1]; }

async function handleTicket(interaction) {
  const sub = interaction.options.getSubcommand();
  const state = await getGuildState(interaction.guildId);
  if (sub === 'setup') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return respond(interaction, 'Du benötigst **Server verwalten**.');
    const category = interaction.options.getChannel('category', true);
    const supportRole = interaction.options.getRole('support_role', true);
    await mutateGuildState(interaction.guildId, (data) => Object.assign(data.config, { ticketCategoryId: category.id, supportRoleId: supportRole.id }));
    return respond(interaction, `Tickets verwenden jetzt ${category} und ${supportRole}.`);
  }
  if (sub === 'open') {
    if (!state.config.ticketCategoryId || !state.config.supportRoleId) return respond(interaction, 'Das Ticketsystem wurde noch nicht mit `/ticket setup` eingerichtet.');
    const existing = interaction.guild.channels.cache.find((c) => ticketOwner(c) === interaction.user.id);
    if (existing) return respond(interaction, `Du hast bereits ein offenes Ticket: ${existing}`);
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90), type: ChannelType.GuildText,
      parent: state.config.ticketCategoryId, topic: `ticket-owner:${interaction.user.id}`,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: state.config.supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ],
    });
    await channel.send(`Willkommen ${interaction.user}!\n**Anliegen:** ${interaction.options.getString('topic') || 'Nicht angegeben'}\nSupport: <@&${state.config.supportRoleId}>`);
    return respond(interaction, `Ticket erstellt: ${channel}`);
  }
  const ownerId = ticketOwner(interaction.channel);
  const isSupport = interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels) || interaction.member.roles?.cache?.has(state.config.supportRoleId);
  if (!ownerId || (interaction.user.id !== ownerId && !isSupport)) return respond(interaction, 'Dieser Befehl funktioniert nur in deinem Ticket oder für das Support-Team.');
  if (sub === 'close') {
    await respond(interaction, `Ticket wird geschlossen. ${interaction.options.getString('reason') || ''}`, false);
    await modlog(interaction.guild, 'Ticket geschlossen', `${interaction.channel} durch ${interaction.user}.`);
    setTimeout(() => interaction.channel.delete('Ticket geschlossen').catch(() => {}), 2500);
    return;
  }
  const target = await getTargetMember(interaction);
  await interaction.channel.permissionOverwrites.edit(target.id, { ViewChannel: sub === 'add' ? true : null, SendMessages: sub === 'add' ? true : null, ReadMessageHistory: sub === 'add' ? true : null });
  return respond(interaction, `${target} wurde ${sub === 'add' ? 'hinzugefügt' : 'entfernt'}.`);
}

async function finishGiveaway(client, guildId, messageId, reroll = false) {
  const state = await getGuildState(guildId);
  const giveaway = state.giveaways[messageId];
  if (!giveaway || (!reroll && giveaway.ended)) return null;
  const entries = [...new Set(giveaway.entries || [])];
  const winners = [];
  while (entries.length && winners.length < giveaway.winners) winners.push(entries.splice(Math.floor(Math.random() * entries.length), 1)[0]);
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  const message = channel?.isTextBased() ? await channel.messages.fetch(messageId).catch(() => null) : null;
  const winnerText = winners.length ? winners.map((id) => `<@${id}>`).join(', ') : 'Keine gültigen Teilnehmer';
  if (message) await message.edit({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle(`🎉 ${giveaway.prize}`).setDescription(`Gewinner: ${winnerText}\nTeilnahmen: ${entries.length + winners.length}`).setFooter({ text: 'Gewinnspiel beendet' })], components: [] });
  await mutateGuildState(guildId, (data) => { data.giveaways[messageId].ended = true; data.giveaways[messageId].lastWinners = winners; });
  if (channel?.isTextBased()) await channel.send(winners.length ? `Glückwunsch ${winnerText}! Ihr gewinnt **${giveaway.prize}**.` : `Für **${giveaway.prize}** gab es keine Teilnehmer.`);
  giveawayTimers.delete(messageId);
  return winners;
}

function scheduleGiveaway(client, guildId, messageId, endAt) {
  clearTimeout(giveawayTimers.get(messageId));
  const delay = Math.max(0, Math.min(endAt - Date.now(), 2_147_000_000));
  giveawayTimers.set(messageId, setTimeout(() => finishGiveaway(client, guildId, messageId).catch(console.error), delay));
}

export async function restoreGiveaways(client) {
  for (const state of await listGuildStates()) for (const [messageId, giveaway] of Object.entries(state.giveaways)) {
    if (!giveaway.ended) scheduleGiveaway(client, state._id, messageId, giveaway.endAt);
  }
}

async function handleGiveaway(interaction) {
  const sub = interaction.options.getSubcommand();
  const id = interaction.options.getString('message_id');
  if (sub === 'start') {
    const prize = interaction.options.getString('prize', true);
    const winners = interaction.options.getInteger('winners') || 1;
    const endAt = Date.now() + interaction.options.getInteger('minutes', true) * 60_000;
    const message = await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle(`🎉 ${prize}`).setDescription(`Klicke auf **Teilnehmen**.\nEnde: <t:${unix(endAt)}:R>\nGewinner: ${winners}`)], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('giveaway:pending').setLabel('Teilnehmen').setEmoji('🎉').setStyle(ButtonStyle.Primary))] });
    await message.edit({ components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway:${message.id}`).setLabel('Teilnehmen').setEmoji('🎉').setStyle(ButtonStyle.Primary))] });
    await mutateGuildState(interaction.guildId, (state) => { state.giveaways[message.id] = { channelId: interaction.channelId, prize, winners, endAt, entries: [], ended: false }; });
    scheduleGiveaway(interaction.client, interaction.guildId, message.id, endAt);
    return respond(interaction, `Gewinnspiel gestartet: ${message.url}`);
  }
  const state = await getGuildState(interaction.guildId);
  if (!state.giveaways[id]) return respond(interaction, 'Gewinnspiel nicht gefunden.');
  const winners = await finishGiveaway(interaction.client, interaction.guildId, id, sub === 'reroll');
  return respond(interaction, winners ? `${sub === 'reroll' ? 'Neu ausgelost' : 'Beendet'}: ${winners.length} Gewinner.` : 'Dieses Gewinnspiel ist bereits beendet.');
}

export async function handleButton(interaction) {
  if (!interaction.customId.startsWith('giveaway:')) return;
  const messageId = interaction.customId.split(':')[1];
  const state = await getGuildState(interaction.guildId);
  const giveaway = state.giveaways[messageId];
  if (!giveaway || giveaway.ended) return respond(interaction, 'Dieses Gewinnspiel ist beendet.');
  const joined = giveaway.entries.includes(interaction.user.id);
  await mutateGuildState(interaction.guildId, (data) => {
    const entries = data.giveaways[messageId].entries;
    if (joined) data.giveaways[messageId].entries = entries.filter((id) => id !== interaction.user.id);
    else entries.push(interaction.user.id);
  });
  return respond(interaction, joined ? 'Teilnahme zurückgezogen.' : 'Du nimmst jetzt teil!');
}

export async function handleCommand(interaction) {
  if (!interaction.inGuild()) return respond(interaction, 'Dieser Befehl funktioniert nur auf einem Server.');
  const name = interaction.commandName;
  if (name === 'ping') return respond(interaction, `Pong! WebSocket: **${interaction.client.ws.ping} ms**`);
  if (name === 'help') return respond(interaction, { embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Kyrox Bot – Befehle').setDescription('**Info:** `/ping` `/help` `/serverinfo` `/userinfo` `/avatar`\n**Moderation:** `/clear` `/kick` `/ban` `/unban` `/timeout` `/untimeout` `/warn` `/lock` `/unlock` `/slowmode` `/role` `/nick`\n**Tickets:** `/ticket setup|open|close|add|remove`\n**Economy:** `/balance` `/daily` `/work` `/pay` `/leaderboard`\n**Level:** `/rank` `/leaderboard type:Level`\n**Giveaways:** `/giveaway start|end|reroll`\n**Setup:** `/config` `/security`')] });
  if (name === 'serverinfo') return respond(interaction, { embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(interaction.guild.name).setThumbnail(interaction.guild.iconURL()).addFields({ name: 'Mitglieder', value: `${interaction.guild.memberCount}`, inline: true }, { name: 'Kanäle', value: `${interaction.guild.channels.cache.size}`, inline: true }, { name: 'Rollen', value: `${interaction.guild.roles.cache.size}`, inline: true }, { name: 'Erstellt', value: `<t:${unix(interaction.guild.createdAt)}:D>` })] });
  if (name === 'avatar') { const user = interaction.options.getUser('user') || interaction.user; return respond(interaction, { embeds: [new EmbedBuilder().setTitle(`Avatar von ${user.username}`).setImage(user.displayAvatarURL({ size: 1024 }))] }); }
  if (name === 'userinfo') { const target = await getTargetMember(interaction); return respond(interaction, { embeds: [new EmbedBuilder().setColor(target.displayColor || 0x5865f2).setTitle(target.user.tag).setThumbnail(target.displayAvatarURL()).addFields({ name: 'ID', value: target.id }, { name: 'Beigetreten', value: target.joinedAt ? `<t:${unix(target.joinedAt)}:R>` : 'Unbekannt', inline: true }, { name: 'Account erstellt', value: `<t:${unix(target.user.createdAt)}:R>`, inline: true }, { name: 'Rollen', value: target.roles.cache.filter((r) => r.id !== interaction.guildId).map(String).slice(0, 15).join(' ') || 'Keine' })] }); }
  if (name === 'clear') { const count = (await interaction.channel.bulkDelete(interaction.options.getInteger('amount', true), true)).size; return respond(interaction, `${count} Nachrichten gelöscht.`); }
  if (name === 'kick' || name === 'ban' || name === 'timeout' || name === 'untimeout') {
    const target = await getTargetMember(interaction); const why = interaction.options.getString('reason') || `Aktion von ${interaction.user.tag}`;
    if (target.id === interaction.user.id) return respond(interaction, 'Du kannst diese Aktion nicht gegen dich selbst ausführen.');
    if (name === 'kick') { if (!target.kickable) return respond(interaction, 'Dieses Mitglied kann ich nicht kicken.'); await target.kick(why); }
    if (name === 'ban') { if (!target.bannable) return respond(interaction, 'Dieses Mitglied kann ich nicht bannen.'); await target.ban({ reason: why, deleteMessageSeconds: (interaction.options.getInteger('delete_days') || 0) * 86400 }); }
    if (name === 'timeout') { if (!target.moderatable) return respond(interaction, 'Dieses Mitglied kann ich nicht moderieren.'); await target.timeout(interaction.options.getInteger('minutes', true) * 60_000, why); }
    if (name === 'untimeout') { if (!target.moderatable) return respond(interaction, 'Dieses Mitglied kann ich nicht moderieren.'); await target.timeout(null, why); }
    await modlog(interaction.guild, `Moderation: ${name}`, `${target.user.tag} durch ${interaction.user.tag}\nGrund: ${why}`, 0xed4245);
    return respond(interaction, `${target.user.tag}: **${name}** erfolgreich.`);
  }
  if (name === 'unban') { const id = interaction.options.getString('user_id', true); await interaction.guild.members.unban(id, interaction.options.getString('reason') || `Entbannt von ${interaction.user.tag}`); return respond(interaction, `${id} wurde entbannt.`); }
  if (name === 'warn') {
    const sub = interaction.options.getSubcommand(); const target = await getTargetMember(interaction);
    if (sub === 'add') { const warning = { id: crypto.randomUUID().slice(0, 8), reason: interaction.options.getString('reason', true), moderatorId: interaction.user.id, createdAt: Date.now() }; await mutateGuildState(interaction.guildId, (s) => (s.warnings[target.id] ||= []).push(warning)); await modlog(interaction.guild, 'Verwarnung', `${target} – ${warning.reason}`, 0xfee75c); return respond(interaction, `${target} wurde verwarnt. ID: ${warning.id}`); }
    const warnings = (await getGuildState(interaction.guildId)).warnings[target.id] || [];
    if (sub === 'list') return respond(interaction, warnings.length ? warnings.map((w) => `${w.id} · <t:${unix(w.createdAt)}:d> – ${w.reason} (<@${w.moderatorId}>)`).join('\n') : 'Keine Verwarnungen.');
    if (sub === 'remove') { const id = interaction.options.getString('id', true); const found = warnings.some((w) => w.id === id); await mutateGuildState(interaction.guildId, (s) => { s.warnings[target.id] = (s.warnings[target.id] || []).filter((w) => w.id !== id); }); return respond(interaction, found ? `Verwarnung ${id} entfernt.` : 'Warnungs-ID nicht gefunden.'); }
    await mutateGuildState(interaction.guildId, (s) => { s.warnings[target.id] = []; }); return respond(interaction, `Alle Verwarnungen von ${target} entfernt.`);
  }
  if (name === 'lock' || name === 'unlock') { await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: name === 'lock' ? false : null }); return respond(interaction, `Kanal ${name === 'lock' ? 'gesperrt 🔒' : 'entsperrt 🔓'}.`); }
  if (name === 'slowmode') { const seconds = interaction.options.getInteger('seconds', true); await interaction.channel.setRateLimitPerUser(seconds); return respond(interaction, `Slowmode: **${seconds} Sekunden**.`); }
  if (name === 'role') { const target = await getTargetMember(interaction); const role = interaction.options.getRole('role', true); if (role.position >= interaction.guild.members.me.roles.highest.position) return respond(interaction, 'Diese Rolle steht über meiner höchsten Rolle.'); const sub = interaction.options.getSubcommand(); await target.roles[sub === 'add' ? 'add' : 'remove'](role); return respond(interaction, `${role} wurde bei ${target} ${sub === 'add' ? 'hinzugefügt' : 'entfernt'}.`); }
  if (name === 'nick') { const target = await getTargetMember(interaction); if (!target.manageable) return respond(interaction, 'Diesen Nicknamen kann ich nicht ändern.'); await target.setNickname(interaction.options.getString('nickname')); return respond(interaction, `Nickname von ${target.user.tag} aktualisiert.`); }
  if (name === 'ticket') return handleTicket(interaction);
  if (name === 'balance') { const user = interaction.options.getUser('user') || interaction.user; const account = economyUser(await getGuildState(interaction.guildId), user.id); return respond(interaction, `**${user.username}**\nWallet: ${coins(account.wallet)}\nBank: ${coins(account.bank)}`); }
  if (name === 'daily' || name === 'work') {
    const now = Date.now(); const field = name === 'daily' ? 'dailyAt' : 'workAt'; const cooldown = name === 'daily' ? 86_400_000 : 3_600_000; const reward = name === 'daily' ? 500 : 100 + Math.floor(Math.random() * 301);
    const account = economyUser(await getGuildState(interaction.guildId), interaction.user.id); if (now - account[field] < cooldown) return respond(interaction, `Noch <t:${unix(account[field] + cooldown)}:R> warten.`);
    await mutateGuildState(interaction.guildId, (s) => { const a = economyUser(s, interaction.user.id); a.wallet += reward; a[field] = now; }); return respond(interaction, `Du erhältst ${coins(reward)}.`);
  }
  if (name === 'pay') { const target = interaction.options.getUser('member', true); const amount = interaction.options.getInteger('amount', true); if (target.bot || target.id === interaction.user.id) return respond(interaction, 'Ungültiger Empfänger.'); const account = economyUser(await getGuildState(interaction.guildId), interaction.user.id); if (account.wallet < amount) return respond(interaction, 'Du hast nicht genug Coins.'); await mutateGuildState(interaction.guildId, (s) => { economyUser(s, interaction.user.id).wallet -= amount; economyUser(s, target.id).wallet += amount; }); return respond(interaction, `${coins(amount)} an ${target} überwiesen.`); }
  if (name === 'rank') { const user = interaction.options.getUser('user') || interaction.user; const profile = levelUser(await getGuildState(interaction.guildId), user.id); const level = levelFromXp(profile.xp); return respond(interaction, `**${user.username}** – Level **${level}**, ${profile.xp} XP, ${profile.messages} Nachrichten\nNächstes Level: ${100 * (level + 1) ** 2} XP`); }
  if (name === 'leaderboard') { const type = interaction.options.getString('type', true); const state = await getGuildState(interaction.guildId); const rows = Object.entries(type === 'economy' ? state.economy : state.levels).sort(([, a], [, b]) => type === 'economy' ? (b.wallet + b.bank) - (a.wallet + a.bank) : b.xp - a.xp).slice(0, 10); return respond(interaction, rows.length ? rows.map(([id, data], i) => `**${i + 1}.** <@${id}> — ${type === 'economy' ? coins(data.wallet + data.bank) : `${levelFromXp(data.xp)} Level · ${data.xp} XP`}`).join('\n') : 'Noch keine Daten.'); }
  if (name === 'giveaway') return handleGiveaway(interaction);
  if (name === 'config' || name === 'security') {
    const sub = interaction.options.getSubcommand(); const state = await getGuildState(interaction.guildId);
    if (sub === 'show') return respond(interaction, `Willkommen: **${state.config.welcomeEnabled ? 'an' : 'aus'}** ${state.config.welcomeChannelId ? `<#${state.config.welcomeChannelId}>` : ''}\nLogs: ${state.config.logChannelId ? `<#${state.config.logChannelId}>` : 'nicht gesetzt'}\nAutorole: ${state.config.autoroleId ? `<@&${state.config.autoroleId}>` : 'nicht gesetzt'}\nAnti-Invite: **${state.config.antiinvite ? 'an' : 'aus'}**\nAnti-Spam: **${state.config.antispam ? 'an' : 'aus'}**`);
    await mutateGuildState(interaction.guildId, (s) => {
      if (sub === 'welcome') { s.config.welcomeEnabled = interaction.options.getBoolean('enabled', true); s.config.welcomeChannelId = interaction.options.getChannel('channel')?.id || s.config.welcomeChannelId; }
      if (sub === 'logs') s.config.logChannelId = interaction.options.getChannel('channel', true).id;
      if (sub === 'autorole') s.config.autoroleId = interaction.options.getRole('role', true).id;
      if (sub === 'antiinvite' || sub === 'antispam') s.config[sub] = interaction.options.getBoolean('enabled', true);
    });
    return respond(interaction, `Konfiguration **${sub}** gespeichert.`);
  }
}

export async function handleMessage(message) {
  if (!message.inGuild() || message.author.bot) return;
  const state = await getGuildState(message.guildId);
  const canBypass = message.member.permissions.has(PermissionFlagsBits.ManageMessages);
  if (state.config.antiinvite && !canBypass && invitePattern.test(message.content)) { await message.delete().catch(() => {}); await message.channel.send(`${message.author}, Einladungslinks sind hier nicht erlaubt.`).then((m) => setTimeout(() => m.delete().catch(() => {}), 5000)); return; }
  if (state.config.antispam && !canBypass) {
    const key = `${message.guildId}:${message.author.id}`; const recent = (spamTracker.get(key) || []).filter((time) => Date.now() - time < 8000); recent.push(Date.now()); spamTracker.set(key, recent);
    if (recent.length >= 6) { await message.delete().catch(() => {}); if (message.member.moderatable) await message.member.timeout(5 * 60_000, 'Automatischer Spam-Schutz').catch(() => {}); spamTracker.delete(key); await modlog(message.guild, 'Anti-Spam', `${message.author.tag} wurde wegen Spam gestoppt.`, 0xed4245); return; }
  }
  const key = `${message.guildId}:${message.author.id}`; if (Date.now() - (xpCooldown.get(key) || 0) < 60_000) return; xpCooldown.set(key, Date.now());
  const gained = 15 + Math.floor(Math.random() * 11); let leveled;
  await mutateGuildState(message.guildId, (s) => { const profile = levelUser(s, message.author.id); const before = levelFromXp(profile.xp); profile.xp += gained; profile.messages += 1; const after = levelFromXp(profile.xp); if (after > before) leveled = after; });
  if (leveled) await message.channel.send(`🎉 ${message.author}, du hast **Level ${leveled}** erreicht!`).catch(() => {});
}

export async function handleGuildMemberAdd(member) {
  const state = await getGuildState(member.guild.id);
  if (state.config.autoroleId) await member.roles.add(state.config.autoroleId, 'Automatische Rolle').catch(() => {});
  const channel = state.config.welcomeEnabled && state.config.welcomeChannelId && member.guild.channels.cache.get(state.config.welcomeChannelId);
  if (channel?.isTextBased()) await channel.send(`👋 Willkommen ${member} auf **${member.guild.name}**! Du bist Mitglied #${member.guild.memberCount}.`).catch(() => {});
}
