import { NextResponse } from "next/server";

import { decodeAppleIdToken, exchangeAppleCode, isAppleLoginConfigured } from "@/lib/apple-auth";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

async function handleCallback(req: Request) {
  const site = siteUrl();
  if (!isAppleLoginConfigured()) {
    return NextResponse.redirect(`${site}/my/bookings?apple=not_configured`);
  }

  let code: string | null = null;
  let userJson: string | null = null;

  if (req.method === "POST") {
    const form = await req.formData();
    code = String(form.get("code") ?? "") || null;
    userJson = String(form.get("user") ?? "") || null;
  } else {
    const { searchParams } = new URL(req.url);
    code = searchParams.get("code");
    userJson = searchParams.get("user");
  }

  if (!code) {
    return NextResponse.redirect(`${site}/my/bookings?apple=failed`);
  }

  try {
    const redirectUri = `${site}/api/auth/apple/callback`;
    const token = await exchangeAppleCode(code, redirectUri);
    const claims = token.id_token ? decodeAppleIdToken(token.id_token) : {};
    let displayName = claims.email?.split("@")[0] ?? "Apple 會員";

    if (userJson) {
      try {
        const user = JSON.parse(userJson) as {
          name?: { firstName?: string; lastName?: string };
        };
        const full = [user.name?.lastName, user.name?.firstName].filter(Boolean).join("");
        if (full) displayName = full;
      } catch {
        /* ignore parse errors */
      }
    }

    const res = NextResponse.redirect(`${site}/my/bookings?apple=ok`);
    if (claims.sub) {
      res.cookies.set("apple_uid", claims.sub, { httpOnly: true, maxAge: 86400 * 30, path: "/" });
      res.cookies.set("apple_name", displayName, { maxAge: 86400 * 30, path: "/" });
    }
    return res;
  } catch {
    return NextResponse.redirect(`${site}/my/bookings?apple=failed`);
  }
}

export async function POST(req: Request) {
  return handleCallback(req);
}

export async function GET(req: Request) {
  return handleCallback(req);
}
