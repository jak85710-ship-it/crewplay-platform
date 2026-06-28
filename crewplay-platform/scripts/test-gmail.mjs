/**
 * 驗證 Gmail SMTP 設定（讀取 .env.local，不印出密碼）
 * 用法：node scripts/test-gmail.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv(envPath);
const user = env.GMAIL_USER || "crew.matchplay@gmail.com";
const pass = (env.GMAIL_APP_PASSWORD || "").replace(/\s/g, "");
const notifyTo = env.GMAIL_NOTIFY_TO || user;

if (!pass) {
  console.error("❌ GMAIL_APP_PASSWORD 未設定（.env.local）");
  process.exit(1);
}

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
});

console.log(`檢查 SMTP：${user} → 通知信箱 ${notifyTo}`);

try {
  await transport.verify();
  console.log("✅ SMTP 連線成功");
} catch (err) {
  console.error("❌ SMTP 連線失敗：", err.message);
  console.error("   請確認 Google 帳戶已開啟「兩步驟驗證」並使用「應用程式密碼」");
  process.exit(1);
}

const info = await transport.sendMail({
  from: `"CrewPlay 測試" <${user}>`,
  to: notifyTo,
  subject: "[CrewPlay] Gmail 設定測試",
  text: `這是一封測試信。\n時間：${new Date().toLocaleString("zh-TW", { hour12: false })}\n若收到代表 SMTP 設定正確。`,
});

console.log(`✅ 測試信已寄出 messageId=${info.messageId}`);
console.log("   請到收件匣（含垃圾郵件）確認。");
