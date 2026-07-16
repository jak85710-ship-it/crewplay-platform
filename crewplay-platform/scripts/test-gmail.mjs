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
const smtpHost = (env.SMTP_HOST || "").trim();
const smtpPort = Number((env.SMTP_PORT || "").trim() || 0) || undefined;
const smtpSecureRaw = (env.SMTP_SECURE || "").trim().toLowerCase();
const smtpSecure =
  smtpSecureRaw === "true" ? true : smtpSecureRaw === "false" ? false : undefined;

if (!pass) {
  console.error("❌ GMAIL_APP_PASSWORD 未設定（.env.local）");
  process.exit(1);
}

const transport = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort || 587,
      secure: smtpSecure ?? false,
      auth: { user, pass },
    })
  : nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

console.log(`檢查 SMTP：${user} → 通知信箱 ${notifyTo}`);
if (smtpHost) {
  console.log(`自訂 SMTP：${smtpHost}:${smtpPort || 587} secure=${String(smtpSecure ?? false)}`);
}

try {
  await transport.verify();
  console.log("✅ SMTP 連線成功");
} catch (err) {
  console.error("❌ SMTP 連線失敗：", err.message);
  if (err?.code === "ENOTFOUND") {
    console.error("   目前為 DNS 解析失敗，請先檢查網路 DNS 或改用自訂 SMTP_HOST。");
    console.error("   建議先測試：nslookup smtp.gmail.com");
  } else if (err?.code === "EAUTH") {
    console.error("   帳密驗證失敗，請確認 Gmail 已開啟兩步驟驗證並使用應用程式密碼。");
  } else {
    console.error("   請確認 Google 帳戶已開啟「兩步驟驗證」並使用「應用程式密碼」。");
  }
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
