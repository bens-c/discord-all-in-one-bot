import { clearSessionCookie, dashboardUrl } from "@/lib/discord-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(dashboardUrl());
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}
