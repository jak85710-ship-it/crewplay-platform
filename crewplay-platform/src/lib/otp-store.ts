import fs from "fs";
import path from "path";

type OtpRecord = {
  code: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
};

function otpFilePath(): string {
  if (process.env.OTP_STORE_PATH) return process.env.OTP_STORE_PATH;
  // Netlify/Lambda: only /tmp is writable
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "crewplay-phone-otp.json");
  }
  return path.join(process.cwd(), ".data", "phone-otp.json");
}

const SEND_COOLDOWN_MS = 60_000;
const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

function ensureStore() {
  const OTP_FILE = otpFilePath();
  const dir = path.dirname(OTP_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(OTP_FILE)) {
    fs.writeFileSync(OTP_FILE, "{}", "utf8");
  }
}

function readStore(): Record<string, OtpRecord> {
  ensureStore();
  const OTP_FILE = otpFilePath();
  try {
    return JSON.parse(fs.readFileSync(OTP_FILE, "utf8")) as Record<string, OtpRecord>;
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, OtpRecord>) {
  ensureStore();
  const OTP_FILE = otpFilePath();
  fs.writeFileSync(OTP_FILE, JSON.stringify(data, null, 2), "utf8");
}

function purgeExpired(data: Record<string, OtpRecord>) {
  const now = Date.now();
  for (const key of Object.keys(data)) {
    if (data[key].expiresAt < now) delete data[key];
  }
}

export function canSendOtp(phone: string): { ok: boolean; waitSec?: number } {
  const data = readStore();
  const rec = data[phone];
  if (!rec) return { ok: true };
  const elapsed = Date.now() - rec.sentAt;
  if (elapsed < SEND_COOLDOWN_MS) {
    return { ok: false, waitSec: Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000) };
  }
  return { ok: true };
}

export function saveOtp(phone: string, code: string) {
  const data = readStore();
  purgeExpired(data);
  const now = Date.now();
  data[phone] = {
    code,
    sentAt: now,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
  };
  writeStore(data);
}

export function verifyOtp(phone: string, code: string): { ok: boolean; reason?: string } {
  const data = readStore();
  purgeExpired(data);
  const rec = data[phone];
  if (!rec) return { ok: false, reason: "expired" };
  if (rec.expiresAt < Date.now()) {
    delete data[phone];
    writeStore(data);
    return { ok: false, reason: "expired" };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many" };
  }
  rec.attempts += 1;
  if (rec.code !== code.trim()) {
    writeStore(data);
    return { ok: false, reason: "wrong" };
  }
  delete data[phone];
  writeStore(data);
  return { ok: true };
}
