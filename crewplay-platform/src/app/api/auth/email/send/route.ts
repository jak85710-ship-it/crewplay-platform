import { NextResponse } from "next/server";

import { generateOtp, normalizeEmail } from "@/lib/email-auth";
import {
  buildEmailOtpSetCookie,
  canSendEmailOtp,
  saveEmailOtp,
} from "@/lib/email-otp-store";
import { isEmailConfigured, sendLoginOtpEmail } from "@/lib/email";
import { isDevOtpEnabled } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    let body: { email?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const email = normalizeEmail(String(body.email ?? ""));
    if (!email) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const gate = canSendEmailOtp(email, req.headers.get("cookie"));
    if (!gate.ok) {
      return NextResponse.json({ error: "cooldown", waitSec: gate.waitSec }, { status: 429 });
    }

    if (!isEmailConfigured() && !isDevOtpEnabled()) {
      return NextResponse.json(
        {
          error: "email_not_configured",
          message: "Email 登入尚未設定，請使用 LINE 登入或聯絡客服",
        },
        { status: 503 }
      );
    }

    const code = generateOtp();
    const sent = await sendLoginOtpEmail(email, code);

    if (!sent.ok) {
      if (isDevOtpEnabled()) {
        const res = NextResponse.json({ ok: true, devCode: code });
        if (process.env.NODE_ENV === "production") {
          res.headers.set("Set-Cookie", buildEmailOtpSetCookie(email, code));
        } else {
          saveEmailOtp(email, code);
        }
        console.warn(`[CrewPlay Email OTP dev] ${email} -> ${code} (${sent.error})`);
        return res;
      }
      console.error(`[CrewPlay Email OTP] send failed: ${sent.error}`);
      return NextResponse.json(
        { error: "email_failed", message: "驗證信發送失敗，請稍後再試" },
        { status: 503 }
      );
    }

    const res = NextResponse.json({ ok: true });
    if (process.env.NODE_ENV === "production") {
      res.headers.set("Set-Cookie", buildEmailOtpSetCookie(email, code));
    } else {
      saveEmailOtp(email, code);
    }
    return res;
  } catch (err) {
    console.error("[CrewPlay Email OTP] send error:", err);
    return NextResponse.json(
      { error: "server_error", message: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}
