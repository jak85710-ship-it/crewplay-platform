import { NextResponse } from "next/server";

import { getLineCallbackUrl, getPublicSiteUrl, isLineLoginConfigured } from "@/lib/line-auth";

export async function GET(req: Request) {
  const site = getPublicSiteUrl();
  if (!isLineLoginConfigured()) {
    return NextResponse.redirect(`${site}/login?line=not_configured`);
  }

  const { searchParams } = new URL(req.url);
  const redirect = searchParams.get("redirect");
  const state =
    redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? `crewplay:${redirect}`
      : "crewplay";

  const channelId = process.env.LINE_CHANNEL_ID!.trim();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: getLineCallbackUrl(),
    scope: "profile openid",
    state,
  });
  return NextResponse.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params}`);
}
