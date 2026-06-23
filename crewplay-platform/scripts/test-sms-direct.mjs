/**
 * 直接測試 Mitake / Twilio 簡訊（不需啟動網站）
 * 用法：node scripts/test-sms-direct.mjs 0912345678
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(".env");
loadEnv(".env.local");

const phoneArg = process.argv[2];
if (!phoneArg) {
  console.error("用法: node scripts/test-sms-direct.mjs 0912345678");
  process.exit(1);
}

const digits = phoneArg.replace(/\D/g, "");
const phone =
  digits.startsWith("8869") && digits.length === 12
    ? `0${digits.slice(3)}`
    : digits.startsWith("09") && digits.length === 10
      ? digits
      : null;

if (!phone) {
  console.error("請輸入 09 開頭 10 碼手機");
  process.exit(1);
}

const code = String(Math.floor(100000 + Math.random() * 900000));
const brand = process.env.SMS_BRAND_NAME || "CrewPlay";
const message = `【${brand}】您的登入驗證碼為 ${code}，5 分鐘內有效。`;

async function mitake() {
  const username = process.env.MITAKE_USERNAME;
  const password = process.env.MITAKE_PASSWORD;
  if (!username || !password) return null;

  const url =
    process.env.MITAKE_API_URL ||
    "https://smsapi.mitake.com.tw/api/mtk/SmSend?CharsetURL=UTF-8";
  const body = new URLSearchParams({ username, password, dstaddr: phone, smbody: message });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  return { provider: "mitake", status: res.status, text: text.trim() };
}

async function twilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return null;

  const to = `+886${phone.slice(1)}`;
  const body = new URLSearchParams({ To: to, From: from, Body: message });
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await res.text();
  return { provider: "twilio", status: res.status, text };
}

const mode = (process.env.SMS_PROVIDER || "auto").toLowerCase();
console.log(`測試號碼: ${phone}`);
console.log(`SMS_PROVIDER: ${mode}`);
console.log(`驗證碼: ${code}`);
console.log("");

let result = null;
if (mode === "twilio") result = await twilio();
else if (mode === "mitake") result = await mitake();
else {
  result = (await mitake()) || (await twilio());
}

if (!result) {
  console.error("未設定 MITAKE_USERNAME/PASSWORD 或 TWILIO 環境變數");
  process.exit(1);
}

console.log(`[${result.provider}] HTTP ${result.status}`);
console.log(result.text);

const ok =
  result.provider === "mitake"
    ? result.text.startsWith("[1]") || /msgid=/i.test(result.text)
    : result.status === 201 || result.status === 200;

process.exit(ok ? 0 : 1);
