import crypto from "node:crypto";

import { getMemberKeyFromBooking } from "@/lib/member-key";
import type { Booking } from "@/types";

type CancelBookingTokenPayload = {
  bookingId: string;
  memberKey: string;
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

export function issueCancelBookingAuthToken(booking: Booking): string {
  const secret = signingSecret();
  const memberKey = getMemberKeyFromBooking(booking);
  if (!secret || !booking.id || !memberKey) return "";

  const payload: CancelBookingTokenPayload = {
    bookingId: booking.id,
    memberKey,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
  };

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function memberKeyFromCancelBookingToken(
  token: string | null | undefined,
  bookingId: string
): string | null {
  const secret = signingSecret();
  if (!secret || !token?.includes(".")) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  let payload: CancelBookingTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CancelBookingTokenPayload;
  } catch {
    return null;
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (!payload.bookingId || payload.bookingId !== bookingId) return null;
  if (!payload.memberKey?.trim()) return null;
  return payload.memberKey.trim();
}
