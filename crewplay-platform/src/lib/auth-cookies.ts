/** Production cookie options shared across www / apex hostnames */
export function authCookieOptions(maxAge: number): {
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
  if (isProd && site.includes("crewplay.tw")) {
    return { ...opts, domain: ".crewplay.tw" };
  }
  return opts;
}
