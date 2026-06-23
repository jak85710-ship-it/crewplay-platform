/**
 * Mitake SMS proxy — deploy on a VPS with fixed public IP.
 * Whitelist this IP with Mitake, then point Netlify at this service.
 *
 *   node server.mjs
 *
 * Env: PORT, SMS_PROXY_SECRET, MITAKE_USERNAME, MITAKE_PASSWORD, SMS_BRAND_NAME
 */
import http from "http";

const PORT = Number(process.env.PORT || 8787);
const SECRET = process.env.SMS_PROXY_SECRET || "";
const MITAKE_USER = process.env.MITAKE_USERNAME || "";
const MITAKE_PASS = process.env.MITAKE_PASSWORD || "";
const BRAND = process.env.SMS_BRAND_NAME || "CrewPlay";
const MITAKE_URL =
  process.env.MITAKE_API_URL ||
  "https://smsapi.mitake.com.tw/api/mtk/SmSend?CharsetURL=UTF-8";

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("8869") && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.startsWith("09") && digits.length === 10) return digits;
  return "";
}

function authOk(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  return SECRET && token === SECRET;
}

async function sendMitake(phone, code) {
  const message = `【${BRAND}】您的登入驗證碼為 ${code}，5 分鐘內有效。`;
  const body = new URLSearchParams({
    username: MITAKE_USER,
    password: MITAKE_PASS,
    dstaddr: phone,
    smbody: message,
  });

  const res = await fetch(MITAKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = (await res.text()).trim();
  if (!res.ok) return { ok: false, error: text || `HTTP ${res.status}` };
  if (text.startsWith("[1]") || /msgid=/i.test(text)) return { ok: true };
  return { ok: false, error: text || "Mitake send failed" };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, {
      ok: true,
      mitake: Boolean(MITAKE_USER && MITAKE_PASS),
      auth: Boolean(SECRET),
    });
  }

  if (req.method === "POST" && req.url === "/api/sms/login-otp") {
    if (!SECRET || !MITAKE_USER || !MITAKE_PASS) {
      return json(res, 503, { ok: false, error: "proxy_not_configured" });
    }
    if (!authOk(req)) {
      return json(res, 401, { ok: false, error: "unauthorized" });
    }

    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      return json(res, 400, { ok: false, error: "invalid_json" });
    }

    const phone = normalizePhone(payload.phone);
    const code = String(payload.code || "").replace(/\D/g, "");
    if (!phone || code.length !== 6) {
      return json(res, 400, { ok: false, error: "invalid_phone_or_code" });
    }

    try {
      const result = await sendMitake(phone, code);
      return json(res, result.ok ? 200 : 502, result);
    } catch (err) {
      return json(res, 502, { ok: false, error: String(err) });
    }
  }

  json(res, 404, { ok: false, error: "not_found" });
});

server.listen(PORT, () => {
  console.log(`CrewPlay SMS proxy listening on :${PORT}`);
});
