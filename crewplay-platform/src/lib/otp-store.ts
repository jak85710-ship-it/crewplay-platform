import { createHmac, timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";

type OtpRecord = {
  code: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
};

type OtpPayload = {
  phone: string;
  code: string;
  sentAt: number;
  expiresAt: number;
  attempts: number;
};

const COOKIE_NAME = "crewplay_phone_otp";
const SEND_COOLDOWN_MS = 60_000;
const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

function useCookieStore(): boolean {
  return process.env.NODE_ENV === "production";
}

function otpSecret(): string {
  return (
    process.env.OTP_SIGNING_SECRET ||
    process.env.SMS_PROXY_SECRET ||
    process.env.LINE_CHANNEL_SECRET ||
    "crewplay-dev-otp-secret"
  );
}

function cookieDomainAttr(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  if (site.includes("crewplay.tw")) return "; Domain=.crewplay.tw";
  return "";
}

function otpFilePath(): string {
  if (process.env.OTP_STORE_PATH) return process.env.OTP_STORE_PATH;
  return path.join(process.cwd(), ".data", "phone-otp.json");
}

function signPayload(payload: OtpPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", otpSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function parseSignedToken(token: string): OtpPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = createHmac("sha256", otpSecret()).update(data).digest("base64url");
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as OtpPayload;
  } catch {
    return null;
  }
}

function readCookiePayload(cookieHeader: string | null): OtpPayload | null {
  if (!cookieHeader) return null;
  const escaped = COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  if (!match) return null;
  return parseSignedToken(decodeURIComponent(match[1]));
}

export function buildOtpSetCookie(phone: string, code: string): string {
  const now = Date.now();
  const payload: OtpPayload = {
    phone,
    code,
    sentAt: now,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
  };
  const value = encodeURIComponent(signPayload(payload));
  const maxAge = Math.ceil(OTP_TTL_MS / 1000);
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}${cookieDomainAttr()}`;
}

export function buildOtpClearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0${cookieDomainAttr()}`;
}

function buildOtpSetCookieFromPayload(payload: OtpPayload): string {
  const value = encodeURIComponent(signPayload(payload));
  const maxAge = Math.max(1, Math.ceil((payload.expiresAt - Date.now()) / 1000));
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}${cookieDomainAttr()}`;
}

function ensureFileStore() {
  const OTP_FILE = otpFilePath();
  const dir = path.dirname(OTP_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(OTP_FILE)) fs.writeFileSync(OTP_FILE, "{}", "utf8");
}

function readFileStore(): Record<string, OtpRecord> {
  ensureFileStore();
  try {
    return JSON.parse(fs.readFileSync(otpFilePath(), "utf8")) as Record<string, OtpRecord>;
  } catch {
    return {};
  }
}

function writeFileStore(data: Record<string, OtpRecord>) {
  ensureFileStore();
  fs.writeFileSync(otpFilePath(), JSON.stringify(data, null, 2), "utf8");
}

function purgeExpiredFile(data: Record<string, OtpRecord>) {
  const now = Date.now();
  for (const key of Object.keys(data)) {
    if (data[key].expiresAt < now) delete data[key];
  }
}

export function canSendOtp(phone: string, cookieHeader?: string | null): { ok: boolean; waitSec?: number } {
  if (useCookieStore()) {
    const rec = readCookiePayload(cookieHeader ?? null);
    if (!rec || rec.phone !== phone) return { ok: true };
    const elapsed = Date.now() - rec.sentAt;
    if (elapsed < SEND_COOLDOWN_MS) {
      return { ok: false, waitSec: Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000) };
    }
    return { ok: true };
  }

  const data = readFileStore();
  const rec = data[phone];
  if (!rec) return { ok: true };
  const elapsed = Date.now() - rec.sentAt;
  if (elapsed < SEND_COOLDOWN_MS) {
    return { ok: false, waitSec: Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000) };
  }
  return { ok: true };
}

/** @deprecated use buildOtpSetCookie in production */
export function saveOtp(phone: string, code: string) {
  const data = readFileStore();
  purgeExpiredFile(data);
  const now = Date.now();
  data[phone] = { code, sentAt: now, expiresAt: now + OTP_TTL_MS, attempts: 0 };
  writeFileStore(data);
}

export function verifyOtp(
  phone: string,
  code: string,
  cookieHeader?: string | null
): { ok: boolean; reason?: string; setCookie?: string } {
  if (useCookieStore()) {
    const rec = readCookiePayload(cookieHeader ?? null);
    if (!rec || rec.phone !== phone) {
      return { ok: false, reason: "expired", setCookie: buildOtpClearCookie() };
    }
    if (rec.expiresAt < Date.now()) {
      return { ok: false, reason: "expired", setCookie: buildOtpClearCookie() };
    }
    if (rec.attempts >= MAX_ATTEMPTS) {
      return { ok: false, reason: "too_many" };
    }
    if (rec.code !== code.trim()) {
      return {
        ok: false,
        reason: "wrong",
        setCookie: buildOtpSetCookieFromPayload({ ...rec, attempts: rec.attempts + 1 }),
      };
    }
    return { ok: true, setCookie: buildOtpClearCookie() };
  }

  const data = readFileStore();
  purgeExpiredFile(data);
  const rec = data[phone];
  if (!rec) return { ok: false, reason: "expired" };
  if (rec.expiresAt < Date.now()) {
    delete data[phone];
    writeFileStore(data);
    return { ok: false, reason: "expired" };
  }
  if (rec.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many" };
  rec.attempts += 1;
  if (rec.code !== code.trim()) {
    writeFileStore(data);
    return { ok: false, reason: "wrong" };
  }
  delete data[phone];
  writeFileStore(data);
  return { ok: true };
}
