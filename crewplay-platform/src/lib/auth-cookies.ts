/** Production cookie options shared across www / apex hostnames */

const CREWPLAY_COOKIE_DOMAIN = ".crewplay.tw";

export function authCookieOptions(
  maxAge: number,
  _requestHost?: string | null
): {
  maxAge: number;
  path: string;
  sameSite: "lax";
  secure: boolean;
  domain?: string;
} {
  const isProd = process.env.NODE_ENV === "production";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const opts = {
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: isProd || site.startsWith("https://"),
  };

  // 正式站一律用 .crewplay.tw，避免 www / 裸網域 cookie 互不相通
  if (isProd) {
    return { ...opts, domain: CREWPLAY_COOKIE_DOMAIN };
  }

  return opts;
}

export function clearAuthCookieOptions(): ReturnType<typeof authCookieOptions> {
  return { ...authCookieOptions(0), maxAge: 0 };
}
