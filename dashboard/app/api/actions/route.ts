import { getSession } from "@/lib/discord-auth";
import { updateBotState } from "@/lib/bot-store";

const DISCORD_API = "https://discord.com/api/v10";
const snowflake = /^\d{17,20}$/;

export const dynamic = "force-dynamic";

function cleanString(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requireId(value: unknown, label: string) {
  const id = cleanString(value, 20);
  if (!snowflake.test(id)) throw new Error(`${label} ist ungültig.`);
  return id;
}

async function discord(path: string, token: string, method = "GET", body?: unknown, reason?: string) {
  const response = await fetch(`${DISCORD_API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(reason ? { "X-Audit-Log-Reason": encodeURIComponent(reason) } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(detail?.message || `Discord API Fehler ${response.status}.`);
  }
  return response;
}

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session) return Response.json({ error: "Discord-Anmeldung erforderlich." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Ungültige Anfragequelle." }, { status: 403 });
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.GUILD_ID;
  if (!token || !guildId) return Response.json({ error: "Discord ist nicht konfiguriert." }, { status: 503 });

  try {
    const input = await request.json() as Record<string, unknown>;
    const action = cleanString(input.action, 40);
    const reason = cleanString(input.reason, 400) || `Dashboard action by ${session.name}`;
    let message = "Aktion erfolgreich.";

    if (action === "announce") {
      const channelId = requireId(input.channelId, "Kanal");
      const content = cleanString(input.content, 1900);
      if (!content) throw new Error("Nachricht fehlt.");
      await discord(`/channels/${channelId}/messages`, token, "POST", { content, allowed_mentions: { parse: ["users", "roles"] } });
      message = "Nachricht wurde gesendet.";
    } else if (action === "clear") {
      const channelId = requireId(input.channelId, "Kanal");
      const amount = Math.max(1, Math.min(100, Number(input.amount) || 10));
      const messages = await (await discord(`/channels/${channelId}/messages?limit=${amount}`, token)).json() as { id: string; timestamp: string }[];
      const recent = messages.filter((item) => Date.now() - new Date(item.timestamp).getTime() < 13.9 * 86400000).map((item) => item.id);
      if (recent.length === 1) await discord(`/channels/${channelId}/messages/${recent[0]}`, token, "DELETE", undefined, reason);
      if (recent.length > 1) await discord(`/channels/${channelId}/messages/bulk-delete`, token, "POST", { messages: recent }, reason);
      message = `${recent.length} Nachrichten gelöscht.`;
    } else if (["kick", "ban", "unban", "timeout", "untimeout"].includes(action)) {
      const memberId = requireId(input.memberId, "Mitglied");
      if (action === "kick") await discord(`/guilds/${guildId}/members/${memberId}`, token, "DELETE", undefined, reason);
      if (action === "ban") await discord(`/guilds/${guildId}/bans/${memberId}?delete_message_seconds=86400`, token, "PUT", {}, reason);
      if (action === "unban") await discord(`/guilds/${guildId}/bans/${memberId}`, token, "DELETE", undefined, reason);
      if (action === "timeout" || action === "untimeout") {
        const minutes = Math.max(1, Math.min(40320, Number(input.minutes) || 10));
        await discord(`/guilds/${guildId}/members/${memberId}`, token, "PATCH", { communication_disabled_until: action === "timeout" ? new Date(Date.now() + minutes * 60000).toISOString() : null }, reason);
      }
      message = `Moderationsaktion ${action} ausgeführt.`;
    } else if (action === "role-add" || action === "role-remove") {
      const memberId = requireId(input.memberId, "Mitglied");
      const roleId = requireId(input.roleId, "Rolle");
      await discord(`/guilds/${guildId}/members/${memberId}/roles/${roleId}`, token, action === "role-add" ? "PUT" : "DELETE", undefined, reason);
      message = `Rolle wurde ${action === "role-add" ? "hinzugefügt" : "entfernt"}.`;
    } else if (["lock", "unlock", "slowmode"].includes(action)) {
      const channelId = requireId(input.channelId, "Kanal");
      if (action === "lock") await discord(`/channels/${channelId}/permissions/${guildId}`, token, "PUT", { type: 0, allow: "0", deny: "2048" }, reason);
      if (action === "unlock") await discord(`/channels/${channelId}/permissions/${guildId}`, token, "DELETE", undefined, reason);
      if (action === "slowmode") await discord(`/channels/${channelId}`, token, "PATCH", { rate_limit_per_user: Math.max(0, Math.min(21600, Number(input.seconds) || 0)) }, reason);
      message = `Kanalaktion ${action} ausgeführt.`;
    } else if (action === "save-config") {
      const ids = ["welcomeChannelId", "logChannelId", "autoroleId", "ticketCategoryId", "supportRoleId"] as const;
      await updateBotState(guildId, (state) => {
        state.config.welcomeEnabled = Boolean(input.welcomeEnabled);
        state.config.antiinvite = Boolean(input.antiinvite);
        state.config.antispam = Boolean(input.antispam);
        for (const key of ids) state.config[key] = input[key] ? requireId(input[key], key) : null;
      });
      message = "Bot-Konfiguration gespeichert.";
    } else if (action === "economy-adjust" || action === "xp-adjust") {
      const memberId = requireId(input.memberId, "Mitglied");
      const amount = Math.trunc(Math.max(-1_000_000, Math.min(1_000_000, Number(input.amount) || 0)));
      await updateBotState(guildId, (state) => {
        if (action === "economy-adjust") {
          const account = state.economy[memberId] ||= { wallet: 0, bank: 0, dailyAt: 0, workAt: 0 };
          account.wallet = Math.max(0, account.wallet + amount);
        } else {
          const profile = state.levels[memberId] ||= { xp: 0, messages: 0 };
          profile.xp = Math.max(0, profile.xp + amount);
        }
      });
      message = `${action === "economy-adjust" ? "Coins" : "XP"} angepasst.`;
    } else throw new Error("Unbekannte Aktion.");

    return Response.json({ ok: true, message });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Aktion fehlgeschlagen." }, { status: 400 });
  }
}
