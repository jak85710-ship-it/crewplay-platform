import { NextResponse } from "next/server";

import { generateOtp, normalizePhone } from "@/lib/phone-auth";
import { canSendOtp, saveOtp } from "@/lib/otp-store";
import { isDevOtpEnabled, isSmsConfigured, sendLoginOtpSms } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    let body: { phone?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const phone = normalizePhone(String(body.phone ?? ""));
    if (!phone) {
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }

    const gate = canSendOtp(phone);
    if (!gate.ok) {
      return NextResponse.json(
        { error: "cooldown", waitSec: gate.waitSec },
        { status: 429 }
      );
    }

    if (!isSmsConfigured() && !isDevOtpEnabled()) {
      return NextResponse.json(
        {
          error: "sms_not_configured",
          message: "簡訊服務尚未設定，請聯繫客服或稍後再試",
        },
        { status: 503 }
      );
    }

    const code = generateOtp();
    const sms = await sendLoginOtpSms(phone, code);

    if (!sms.ok) {
      if (isDevOtpEnabled()) {
        saveOtp(phone, code);
        console.warn(`[CrewPlay OTP dev] ${phone} -> ${code} (${sms.error})`);
        return NextResponse.json({ ok: true, devCode: code });
      }
      console.error(`[CrewPlay OTP] SMS failed (${sms.provider}): ${sms.error}`);
      return NextResponse.json(
        {
          error: "sms_failed",
          message: "簡訊發送失敗，請確認號碼或稍後再試",
        },
        { status: 503 }
      );
    }

    saveOtp(phone, code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[CrewPlay OTP] send error:", err);
    return NextResponse.json(
      { error: "server_error", message: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}
