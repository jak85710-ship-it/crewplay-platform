import { NextResponse } from "next/server";

import { isAppleLoginConfigured } from "@/lib/apple-auth";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function GET() {
  const site = siteUrl();
  if (!isAppleLoginConfigured()) {
    return NextResponse.redirect(`${site}/my/bookings?apple=not_configured`);
  }

  const clientId = process.env.APPLE_CLIENT_ID!;
  const redirectUri = `${site}/api/auth/apple/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "name email",
    response_mode: "form_post",
    state: "crewplay",
  });

  return NextResponse.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
}
