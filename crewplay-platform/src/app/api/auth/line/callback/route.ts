import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const channelId = process.env.LINE_CHANNEL_ID;
  const secret = process.env.LINE_CHANNEL_SECRET;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code || !channelId || !secret) {
    return NextResponse.redirect(`${site}/my/bookings?line=not_configured`);
  }

  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${site}/api/auth/line/callback`,
      client_id: channelId,
      client_secret: secret,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${site}/my/bookings?line=failed`);
  }

  const token = await tokenRes.json();
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : null;

  const res = NextResponse.redirect(`${site}/my/bookings?line=ok`);
  if (profile?.userId) {
    res.cookies.set("line_uid", profile.userId, { httpOnly: true, maxAge: 86400 * 30, path: "/" });
    res.cookies.set("line_name", profile.displayName ?? "", { maxAge: 86400 * 30, path: "/" });
  }
  return res;
}
