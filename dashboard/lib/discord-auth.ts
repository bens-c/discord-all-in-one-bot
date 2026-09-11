import "server-only";

const encoder = new TextEncoder();
const SESSION_COOKIE = "discord_dashboard_session";
const STATE_COOKIE = "discord_oauth_state";

export type DashboardSession = {
  id: string;
  name: string;
  avatarUrl: string | null;
  expiresAt: number;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not configured.");
  return value;
}

function toBase64Url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

async function signedValue(value: string) {
  return `${value}.${await hmac(value)}`;
}

function readCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  return cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

async function verifySignedValue(value: string | null) {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const unsigned = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  return (await hmac(unsigned)) === signature ? unsigned : null;
}

export async function createStateCookie(state: string) {
  return `${STATE_COOKIE}=${await signedValue(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export async function verifyState(request: Request, state: string | null) {
  return state !== null && await verifySignedValue(readCookie(request, STATE_COOKIE)) === state;
}

export function clearStateCookie() {
  return `${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createSessionCookie(session: DashboardSession) {
  const payload = toBase64Url(JSON.stringify(session));
  return `${SESSION_COOKIE}=${await signedValue(payload)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function getSession(request: Request): Promise<DashboardSession | null> {
  try {
    const payload = await verifySignedValue(readCookie(request, SESSION_COOKIE));
    if (!payload) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DashboardSession;
    if (!session.id || !session.name || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
