import { clearSessionCookie } from "@/lib/discord-auth";

export async function GET(request: Request) {
  const response = Response.redirect(new URL("/", request.url));
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}
