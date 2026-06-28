import { NextResponse } from "next/server";

import { isValidOtp, normalizeEmail } from "@/lib/email-auth";
import { verifyEmailOtp } from "@/lib/email-otp-store";
import { setMemberEmailLogin } from "@/lib/member-session";

export async function POST(req: Request) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = normalizeEmail(String(body.email ?? ""));
  const code = String(body.code ?? "").trim();

  if (!email || !isValidOtp(code)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = verifyEmailOtp(email, code, req.headers.get("cookie"));
  if (!result.ok) {
    const messages: Record<string, string> = {
      expired: "驗證碼已過期，請重新取得",
      wrong: "驗證碼錯誤",
      too_many: "嘗試次數過多，請重新取得驗證碼",
    };
    const res = NextResponse.json(
      { error: result.reason, message: messages[result.reason ?? "wrong"] },
      { status: 401 }
    );
    if (result.setCookie) res.headers.set("Set-Cookie", result.setCookie);
    return res;
  }

  const res = NextResponse.json({ ok: true });
  if (result.setCookie) res.headers.set("Set-Cookie", result.setCookie);
  setMemberEmailLogin(res, email);
  return res;
}
