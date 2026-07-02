import crypto from "node:crypto";

export type MatchCheckInTokenPayload = {
  matchId: string;
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

export function issueMatchCheckInToken(matchId: string, hoursValid = 12): string {
  const secret = signingSecret();
  if (!secret) return "";

  const exp = Math.floor(Date.now() / 1000) + hoursValid * 60 * 60;
  const payload: MatchCheckInTokenPayload = { matchId, exp };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyMatchCheckInToken(token: string | null | undefined): MatchCheckInTokenPayload | null {
  const secret = signingSecret();
  if (!secret || !token?.includes(".")) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  let payload: MatchCheckInTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MatchCheckInTokenPayload;
  } catch {
    return null;
  }

  if (!payload.matchId || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}
