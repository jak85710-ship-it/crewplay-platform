/** Production cookie options shared across www / apex hostnames */

function crewPlayCookieDomain(): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;

  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL ?? "",
    process.env.URL ?? "",
    process.env.DEPLOY_PRIME_URL ?? "",
    process.env.DEPLOY_URL ?? "",
  ];

  for (const url of candidates) {
    if (!url) continue;
    try {
      const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
      if (host === "crewplay.tw" || host.endsWith(".crewplay.tw")) {
        return ".crewplay.tw";
      }
    } catch {
      /* ignore malformed env */
    }
  }

  return undefined;
}

export function authCookieOptions(
  maxAge: number,
  requestHost?: string | null
): {
  maxAge: number;
  path: string;
  sameSite: "lax";
  secure: boolean;
  domain?: string;
} {
  const isProd = process.env.NODE_ENV === "production";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const host = (requestHost ?? "").split(":")[0].toLowerCase();
  const hostIsCrewPlay =
    host === "crewplay.tw" || host.endsWith(".crewplay.tw");

  const opts = {
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: isProd || site.startsWith("https://"),
  };

  const domain = hostIsCrewPlay ? ".crewplay.tw" : crewPlayCookieDomain();
  if (domain) {
    return { ...opts, domain };
  }
  return opts;
}
