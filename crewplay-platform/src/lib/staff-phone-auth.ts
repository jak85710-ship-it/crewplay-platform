import { isValidOtp, normalizePhone } from "@/lib/phone-auth";
import { verifyOtp } from "@/lib/otp-store";

const OTP_ERROR_MESSAGES: Record<string, string> = {
  expired: "驗證碼已過期，請重新取得",
  wrong: "驗證碼錯誤",
  too_many: "嘗試次數過多，請重新取得驗證碼",
};

export function verifyStaffPhoneOtp(
  req: Request,
  phoneRaw: string,
  codeRaw: string
): { ok: true; setCookie?: string } | { ok: false; error: string; setCookie?: string } {
  const phone = normalizePhone(phoneRaw);
  const code = String(codeRaw ?? "").trim();

  if (!phone) {
    return { ok: false, error: "請輸入正確的台灣手機號碼（09 開頭，10 碼）" };
  }
  if (!isValidOtp(code)) {
    return { ok: false, error: "請輸入 6 位數驗證碼" };
  }

  const result = verifyOtp(phone, code, req.headers.get("cookie"));
  if (!result.ok) {
    return {
      ok: false,
      error: OTP_ERROR_MESSAGES[result.reason ?? "wrong"] ?? "驗證失敗",
      setCookie: result.setCookie,
    };
  }

  return { ok: true, setCookie: result.setCookie };
}
