export type SmsSendResult = { ok: true } | { ok: false; error: string; provider?: string };

export type SmsProvider = "mitake" | "twilio" | "auto";

function providerMode(): SmsProvider {
  const v = (process.env.SMS_PROVIDER || "auto").toLowerCase();
  if (v === "mitake" || v === "twilio") return v;
  return "auto";
}

export function isMitakeProxyConfigured(): boolean {
  return Boolean(process.env.MITAKE_PROXY_URL && process.env.SMS_PROXY_SECRET);
}

export function isMitakeConfigured(): boolean {
  return (
    isMitakeProxyConfigured() ||
    Boolean(process.env.MITAKE_USERNAME && process.env.MITAKE_PASSWORD)
  );
}

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
  );
}

export function isSmsConfigured(): boolean {
  const mode = providerMode();
  if (mode === "mitake") return isMitakeConfigured();
  if (mode === "twilio") return isTwilioConfigured();
  return isMitakeConfigured() || isTwilioConfigured();
}

export function isDevOtpEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return process.env.AUTH_DEV_OTP === "true";
  }
  return process.env.AUTH_DEV_OTP !== "false";
}

function otpMessage(code: string): string {
  const brand = process.env.SMS_BRAND_NAME || "CrewPlay";
  return `【${brand}】您的登入驗證碼為 ${code}，5 分鐘內有效。`;
}

async function sendViaMitakeProxy(phone: string, code: string): Promise<SmsSendResult> {
  const url = process.env.MITAKE_PROXY_URL;
  const secret = process.env.SMS_PROXY_SECRET;
  if (!url || !secret) {
    return { ok: false, error: "Mitake proxy 未設定", provider: "mitake-proxy" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ phone, code }),
  });

  let data: { ok?: boolean; error?: string } = {};
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: text || `HTTP ${res.status}`,
      provider: "mitake-proxy",
    };
  }

  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error || `HTTP ${res.status}`,
      provider: "mitake-proxy",
    };
  }

  return { ok: true };
}

async function sendViaMitake(phone: string, message: string): Promise<SmsSendResult> {
  const username = process.env.MITAKE_USERNAME;
  const password = process.env.MITAKE_PASSWORD;
  if (!username || !password) {
    return { ok: false, error: "Mitake 未設定", provider: "mitake" };
  }

  const base =
    process.env.MITAKE_API_URL || "https://smsapi.mitake.com.tw/api/mtk/SmSend?CharsetURL=UTF-8";

  const body = new URLSearchParams({
    username,
    password,
    dstaddr: phone,
    smbody: message,
  });

  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = (await res.text()).trim();
  if (!res.ok) {
    return { ok: false, error: text || `HTTP ${res.status}`, provider: "mitake" };
  }

  // 成功範例：[1]\nmsgid=...
  if (text.startsWith("[1]") || /msgid=/i.test(text)) {
    return { ok: true };
  }

  return { ok: false, error: text || "Mitake 發送失敗", provider: "mitake" };
}

async function sendViaTwilio(phone: string, message: string): Promise<SmsSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, error: "Twilio 未設定", provider: "twilio" };
  }

  const to = phone.startsWith("0") ? `+886${phone.slice(1)}` : phone;
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

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err || `HTTP ${res.status}`, provider: "twilio" };
  }

  return { ok: true };
}

/** 發送登入 OTP 簡訊（Netlify 經固定 IP 閘道，或直接 Mitake / Twilio） */
export async function sendLoginOtpSms(phone: string, code: string): Promise<SmsSendResult> {
  const message = otpMessage(code);
  const mode = providerMode();

  if (mode === "mitake" || mode === "auto") {
    if (isMitakeProxyConfigured()) {
      return sendViaMitakeProxy(phone, code);
    }
  }

  if (mode === "mitake") {
    return sendViaMitake(phone, message);
  }
  if (mode === "twilio") {
    return sendViaTwilio(phone, message);
  }

  if (isMitakeConfigured()) {
    const result = await sendViaMitake(phone, message);
    if (result.ok) return result;
  }
  if (isTwilioConfigured()) {
    return sendViaTwilio(phone, message);
  }

  return { ok: false, error: "未設定簡訊服務（Mitake 或 Twilio）" };
}
