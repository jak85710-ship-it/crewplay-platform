/**
 * 測試 VPS Mitake proxy（需 .env.local 設定 MITAKE_PROXY_URL + SMS_PROXY_SECRET）
 * 用法：node scripts/test-mitake-proxy.mjs 0912345678
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
const url = process.env.MITAKE_PROXY_URL;
const secret = process.env.SMS_PROXY_SECRET;

if (!phoneArg || !url || !secret) {
  console.error("用法: node scripts/test-mitake-proxy.mjs 0912345678");
  console.error("需 .env.local: MITAKE_PROXY_URL, SMS_PROXY_SECRET");
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

console.log(`Proxy: ${url}`);
console.log(`Phone: ${phone}`);
console.log(`Code:  ${code}`);
console.log("");

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  },
  body: JSON.stringify({ phone, code }),
});

const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text);

let ok = false;
try {
  const data = JSON.parse(text);
  ok = res.ok && data.ok === true;
} catch {
  ok = false;
}

process.exit(ok ? 0 : 1);
