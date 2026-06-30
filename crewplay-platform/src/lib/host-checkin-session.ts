import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "crewplay_host_checkin";
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

export type HostCheckInSession = {
  teamId: string;
  phone: string;
  exp: number;
};

function sessionSecret(): string {
  return (
    process.env.BOOKING_AUTH_SECRET?.trim() ||
    process.env.LINE_CHANNEL_SECRET?.trim() ||
    process.env.ADMIN_API_KEY?.trim() ||
    "crewplay-dev-host-session"
  );
}

function cookieDomainAttr(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  if (site.includes("crewplay.tw")) return "; Domain=.crewplay.tw";
  return "";
}

function signSession(payload: HostCheckInSession): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function parseSessionToken(token: string): HostCheckInSession | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as HostCheckInSession;
  } catch {
    return null;
  }
}

function readSessionCookie(cookieHeader: string | null): HostCheckInSession | null {
  if (!cookieHeader) return null;
  const escaped = COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  if (!match) return null;
  const payload = parseSessionToken(decodeURIComponent(match[1]));
  if (!payload || payload.exp < Date.now()) return null;
  return payload;
}

export function buildHostSessionCookie(teamId: string, phone: string): string {
  const payload: HostCheckInSession = {
    teamId,
    phone,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const token = signSession(payload);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
    SESSION_TTL_MS / 1000
  }${cookieDomainAttr()}`;
}

export function verifyHostCheckInSession(
  req: Request,
  teamId?: string
): HostCheckInSession | null {
  const session = readSessionCookie(req.headers.get("cookie"));
  if (!session) return null;
  if (teamId && session.teamId !== teamId) return null;
  return session;
}
