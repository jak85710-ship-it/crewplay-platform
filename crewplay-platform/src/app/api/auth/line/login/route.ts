import { NextResponse } from "next/server";

export async function GET() {
  const channelId = process.env.LINE_CHANNEL_ID;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (!channelId) {
    return NextResponse.json({ error: "LINE_CHANNEL_ID not set" }, { status: 503 });
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: `${site}/api/auth/line/callback`,
    scope: "profile openid",
    state: "crewplay",
  });
  return NextResponse.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params}`);
}
