import crypto from "node:crypto";

export type HostPortalTokenPayload = {
  kind: "host_portal";
  teamId: string;
  exp: number;
};

function signingSecret(): string {
  return (
    process.env.BOOKING_AUTH_SECRET?.trim() ||
    process.env.LINE_CHANNEL_SECRET?.trim() ||
    process.env.ADMIN_API_KEY?.trim() ||
    ""
  );
}

export function issueHostPortalToken(teamId: string): string {
  const secret = signingSecret();
  if (!secret || !teamId) return "";

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const payload: HostPortalTokenPayload = {
    kind: "host_portal",
    teamId,
    exp,
  };

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyHostPortalToken(token: string | null | undefined): HostPortalTokenPayload | null {
  const secret = signingSecret();
  if (!secret || !token?.includes(".")) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  let payload: HostPortalTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as HostPortalTokenPayload;
  } catch {
    return null;
  }

  if (payload.kind !== "host_portal" || !payload.teamId) return null;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export { parseGuestCheckInToken } from "@/lib/parse-guest-checkin-token";
