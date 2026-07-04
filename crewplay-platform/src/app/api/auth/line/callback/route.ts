import { NextResponse } from "next/server";

import { authCookieOptions } from "@/lib/auth-cookies";
import { applyMemberProfileToCookieStore, setMemberSessionKey } from "@/lib/member-session";
import { getLineCallbackUrl, getLineOAuthOrigin, isLineLoginConfigured } from "@/lib/line-auth";

export async function GET(req: Request) {
  const site = getLineOAuthOrigin();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!isLineLoginConfigured()) {
    return NextResponse.redirect(`${site}/login?line=not_configured`);
  }

  const channelId = process.env.LINE_CHANNEL_ID!.trim();
  const secret = process.env.LINE_CHANNEL_SECRET!.trim();

  if (!code) {
    return NextResponse.redirect(`${site}/login?line=failed`);
  }

  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getLineCallbackUrl(),
      client_id: channelId,
      client_secret: secret,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${site}/login?line=failed`);
  }

  const token = await tokenRes.json();
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : null;

  const state = searchParams.get("state") ?? "";
  let target = "/my/bookings?line=ok";
  if (state.startsWith("crewplay:")) {
    const path = state.slice("crewplay:".length);
    if (path.startsWith("/") && !path.startsWith("//")) {
      target = path.includes("?") ? `${path}&line=ok` : `${path}?line=ok`;
    }
  }

  const res = NextResponse.redirect(`${site}${target}`);
  const requestHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const cookieOpts = authCookieOptions(86400 * 30, requestHost);
  if (profile?.userId) {
    res.cookies.set("line_uid", profile.userId, { ...cookieOpts, httpOnly: true });
    res.cookies.set("line_name", profile.displayName ?? "", cookieOpts);
    setMemberSessionKey(res.cookies, `line:${profile.userId}`);
    if (profile.displayName?.trim()) {
      applyMemberProfileToCookieStore(res.cookies, { name: profile.displayName.trim() });
    }
  }
  return res;
}
