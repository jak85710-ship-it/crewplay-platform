import crypto from "node:crypto";

import type { MemberSession } from "@/lib/member-session";

type VerificationTokenPayload = {
  exp: number;
  method: "line" | "email" | "phone" | "apple";
  lineUid?: string;
  email?: string;
  phone?: string;
  appleUid?: string;
  displayName?: string;
  profileEmail?: string;
  contactPhone?: string;
};

function signingSecret(): string {
  return (
    process.env.BOOKING_AUTH_SECRET?.trim() ||
    process.env.LINE_CHANNEL_SECRET?.trim() ||
    process.env.ADMIN_API_KEY?.trim() ||
    ""
  );
}

export function issueVerificationAuthToken(member: MemberSession): string {
  const secret = signingSecret();
  if (!secret || !member.isLoggedIn || !member.method) return "";

  const payload: VerificationTokenPayload = {
    exp: Math.floor(Date.now() / 1000) + 60 * 20,
    method: member.method,
    lineUid: member.lineUid,
    email: member.method === "email" ? member.email : undefined,
    phone: member.phone,
    appleUid: member.appleUid,
    displayName: member.displayName,
    profileEmail: member.email,
    contactPhone: member.contactPhone ?? member.phone,
  };

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function memberSessionFromVerificationToken(token: string | null | undefined): MemberSession | null {
  const secret = signingSecret();
  if (!secret || !token?.includes(".")) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  let payload: VerificationTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as VerificationTokenPayload;
  } catch {
    return null;
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

  if (payload.method === "line" && payload.lineUid) {
    return {
      isLoggedIn: true,
      method: "line",
      lineUid: payload.lineUid,
      displayName: payload.displayName || "LINE 會員",
      name: payload.displayName,
      email: payload.profileEmail,
      contactPhone: payload.contactPhone,
    };
  }

  if (payload.method === "email" && payload.email) {
    return {
      isLoggedIn: true,
      method: "email",
      email: payload.email,
      displayName: payload.displayName || payload.email.split("@")[0],
      name: payload.displayName,
      contactPhone: payload.contactPhone,
    };
  }

  if (payload.method === "phone" && payload.phone) {
    return {
      isLoggedIn: true,
      method: "phone",
      phone: payload.phone,
      displayName: payload.displayName || payload.phone,
      name: payload.displayName,
      email: payload.profileEmail,
      contactPhone: payload.contactPhone || payload.phone,
    };
  }

  if (payload.method === "apple" && payload.appleUid) {
    return {
      isLoggedIn: true,
      method: "apple",
      appleUid: payload.appleUid,
      displayName: payload.displayName || "Apple 會員",
      name: payload.displayName,
      email: payload.profileEmail,
      contactPhone: payload.contactPhone,
    };
  }

  return null;
}
