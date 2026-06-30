import crypto from "node:crypto";

import { bookingReference } from "@/lib/booking-ref";

export type CheckInTokenPayload = {
  bookingId: string;
  ref: string;
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

export function issueCheckInToken(booking: {
  id: string;
  merchant_trade_no?: string | null;
}): string {
  const secret = signingSecret();
  if (!secret) return "";

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90;
  const payload: CheckInTokenPayload = {
    bookingId: booking.id,
    ref: bookingReference(booking),
    exp,
  };

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyCheckInToken(token: string | null | undefined): CheckInTokenPayload | null {
  const secret = signingSecret();
  if (!secret || !token?.includes(".")) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  let payload: CheckInTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CheckInTokenPayload;
  } catch {
    return null;
  }

  if (!payload.bookingId || !payload.ref) return null;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
