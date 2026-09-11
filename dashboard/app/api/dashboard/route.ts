import { getSession } from "@/lib/discord-auth";
import { getBotState } from "@/lib/bot-store";

const DISCORD_API = "https://discord.com/api/v10";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  premium_subscription_count?: number;
  verification_level: number;
};

type DiscordChannel = {
  id: string;
  name?: string;
  type: number;
  position?: number;
  parent_id?: string | null;
};

type DiscordRole = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

type DiscordMember = {
  user: { id: string; username: string; global_name?: string | null; avatar: string | null; bot?: boolean };
  nick?: string | null;
};

type AuditEntry = {
  id: string;
  action_type: number;
  user_id: string | null;
  target_id: string | null;
  reason: string | null;
};

type AuditUser = {
  id: string;
  username: string;
  global_name?: string | null;
};

const actionNames: Record<number, string> = {
  10: "Channel created", 11: "Channel updated", 12: "Channel deleted",
  20: "Member removed", 22: "Member banned", 23: "Member unbanned",
  24: "Member updated", 25: "Member roles updated", 30: "Role created",
  31: "Role updated", 32: "Role deleted", 72: "Message deleted",
  73: "Messages deleted", 80: "Integration created", 110: "Thread created",
};

function discordFetch(path: string, token: string) {
  return fetch(`${DISCORD_API}${path}`, {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store",
  });
}

export async function GET(request: Request) {
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.GUILD_ID;
  const session = await getSession(request);
  if (!session) return Response.json({ error: "Discord login required.", code: "UNAUTHORIZED" }, { status: 401 });

  if (!token || !guildId) {
    return Response.json(
      { error: "DISCORD_TOKEN and GUILD_ID must be configured in dashboard/.env.local." },
      { status: 503 },
    );
  }

  try {
    const [guildResponse, channelsResponse, rolesResponse, auditResponse, botResponse, membersResponse, botState] = await Promise.all([
      discordFetch(`/guilds/${guildId}?with_counts=true`, token),
      discordFetch(`/guilds/${guildId}/channels`, token),
      discordFetch(`/guilds/${guildId}/roles`, token),
      discordFetch(`/guilds/${guildId}/audit-logs?limit=8`, token),
      discordFetch("/users/@me", token),
      discordFetch(`/guilds/${guildId}/members?limit=1000`, token),
      getBotState(guildId).catch(() => null),
    ]);

    if (!guildResponse.ok) {
      const message = guildResponse.status === 401 ? "Discord rejected the bot token." : guildResponse.status === 403 ? "The bot cannot access this server." : "Discord server data is unavailable.";
      return Response.json({ error: message }, { status: guildResponse.status });
    }

    const guild = (await guildResponse.json()) as DiscordGuild;
    const channels = channelsResponse.ok ? (await channelsResponse.json()) as DiscordChannel[] : [];
    const roles = rolesResponse.ok ? (await rolesResponse.json()) as DiscordRole[] : [];
    const audit = auditResponse.ok ? await auditResponse.json() as { audit_log_entries: AuditEntry[]; users: AuditUser[] } : { audit_log_entries: [], users: [] };
    const bot = botResponse.ok ? await botResponse.json() as { username: string; global_name?: string | null } : null;
    const members = membersResponse.ok ? await membersResponse.json() as DiscordMember[] : [];
    const fallbackMembers = audit.users.map((user) => ({
      user: { id: user.id, username: user.username, global_name: user.global_name, avatar: null, bot: false },
      nick: null,
    }));
    const visibleMembers = members.length ? members : fallbackMembers;
    const users = new Map(audit.users.map((user) => [user.id, user.global_name || user.username]));

    return Response.json({
      fetchedAt: new Date().toISOString(),
      viewer: session,
      bot: bot ? { name: bot.global_name || bot.username } : null,
      guild: {
        id: guild.id,
        name: guild.name,
        description: guild.description,
        iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null,
        memberCount: guild.approximate_member_count ?? 0,
        onlineCount: guild.approximate_presence_count ?? 0,
        boostCount: guild.premium_subscription_count ?? 0,
        verificationLevel: guild.verification_level,
      },
      counts: {
        channels: channels.length,
        textChannels: channels.filter((channel) => channel.type === 0 || channel.type === 5).length,
        voiceChannels: channels.filter((channel) => channel.type === 2 || channel.type === 13).length,
        categories: channels.filter((channel) => channel.type === 4).length,
        roles: Math.max(0, roles.length - 1),
      },
      channels: channels
        .filter((channel) => channel.name && [0, 2, 4, 5, 13, 15].includes(channel.type))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((channel) => ({ id: channel.id, name: channel.name, type: channel.type })),
      roles: roles
        .filter((role) => role.name !== "@everyone")
        .sort((a, b) => b.position - a.position)
        .map((role) => ({ id: role.id, name: role.name, color: role.color, managed: role.managed })),
      members: visibleMembers.filter((member) => !member.user.bot).map((member) => ({
        id: member.user.id,
        name: member.nick || member.user.global_name || member.user.username,
        username: member.user.username,
      })).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 1000),
      botState: botState ? {
        available: true,
        config: botState.config,
        economy: Object.entries(botState.economy).map(([id, account]) => ({ id, total: account.wallet + account.bank })).sort((a, b) => b.total - a.total).slice(0, 10),
        levels: Object.entries(botState.levels).map(([id, profile]) => ({ id, xp: profile.xp, messages: profile.messages })).sort((a, b) => b.xp - a.xp).slice(0, 10),
        warnings: Object.values(botState.warnings).reduce((sum, entries) => sum + entries.length, 0),
        activeGiveaways: Object.values(botState.giveaways).filter((item) => !(item as { ended?: boolean }).ended).length,
      } : { available: false },
      activity: audit.audit_log_entries.map((entry) => ({
        id: entry.id,
        action: actionNames[entry.action_type] ?? `Server action ${entry.action_type}`,
        actor: entry.user_id ? users.get(entry.user_id) ?? "Unknown moderator" : "Discord system",
        reason: entry.reason,
      })),
      permissions: { auditLog: auditResponse.ok, memberDirectory: membersResponse.ok, memberDirectoryStatus: membersResponse.status },
    }, { headers: { "Cache-Control": "private, no-store, max-age=0", "CDN-Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not reach the Discord API." }, { status: 502 });
  }
}
