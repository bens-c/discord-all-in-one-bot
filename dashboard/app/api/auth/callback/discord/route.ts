import { clearStateCookie, createSessionCookie, verifyState } from "@/lib/discord-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DiscordUser = { id: string; username: string; global_name?: string | null; avatar: string | null };
type DiscordGuild = { id: string; permissions: string };

function dashboardUrl(request: Request, error?: string) {
  const url = new URL("/", request.url);
  if (error) url.searchParams.set("auth_error", error);
  return url;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const guildId = process.env.GUILD_ID;

  if (!code || !await verifyState(request, state)) return NextResponse.redirect(dashboardUrl(request, "invalid_state"));
  if (!clientId || !clientSecret || !redirectUri || !guildId) return NextResponse.redirect(dashboardUrl(request, "configuration"));

  try {
    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", code, redirect_uri: redirectUri }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return NextResponse.redirect(dashboardUrl(request, "token_exchange"));
    const token = await tokenResponse.json() as { access_token: string };
    const headers = { Authorization: `Bearer ${token.access_token}` };
    const [userResponse, guildsResponse] = await Promise.all([
      fetch("https://discord.com/api/v10/users/@me", { headers, cache: "no-store" }),
      fetch("https://discord.com/api/v10/users/@me/guilds", { headers, cache: "no-store" }),
    ]);
    if (!userResponse.ok || !guildsResponse.ok) return NextResponse.redirect(dashboardUrl(request, "profile"));
    const user = await userResponse.json() as DiscordUser;
    const guilds = await guildsResponse.json() as DiscordGuild[];
    const guild = guilds.find((candidate) => candidate.id === guildId);
    const permissions = guild ? BigInt(guild.permissions) : BigInt(0);
    if (!guild || (permissions & BigInt(8)) === BigInt(0) && (permissions & BigInt(32)) === BigInt(0)) {
      return NextResponse.redirect(dashboardUrl(request, "forbidden"));
    }

    const session = {
      id: user.id,
      name: user.global_name || user.username,
      avatarUrl: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : null,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    };
    const response = NextResponse.redirect(dashboardUrl(request));
    response.headers.append("Set-Cookie", clearStateCookie());
    response.headers.append("Set-Cookie", await createSessionCookie(session));
    return response;
  } catch {
    return NextResponse.redirect(dashboardUrl(request, "unexpected"));
  }
}
