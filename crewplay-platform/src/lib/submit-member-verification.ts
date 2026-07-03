import {
  getMemberCredit,
  submitVerificationRequest,
  touchMemberProfile,
} from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSessionFromReader, type MemberSession } from "@/lib/member-session";
import {
  saveVerificationImage,
  validateVerificationImageContent,
  validateVerificationImageFile,
} from "@/lib/verification-images";
import type { CookieReader } from "@/lib/cookie-reader";

export type VerificationSubmitResult =
  | { ok: true; verification_status: string; message: string }
  | { ok: false; code: "login_required" | "validation" | "server"; error: string };

export async function processVerificationSubmit(
  formData: FormData,
  cookieStore: CookieReader,
  memberOverride?: MemberSession | null
): Promise<VerificationSubmitResult> {
  const member = memberOverride?.isLoggedIn ? memberOverride : getMemberSessionFromReader(cookieStore);
  const memberKey = getMemberKeyFromSession(member);

  if (!memberKey) {
    return { ok: false, code: "login_required", error: "請先登入會員" };
  }

  const agreed = formData.get("agreed") === "true";
  if (!agreed) {
    return { ok: false, code: "validation", error: "請勾選實名認證同意事項" };
  }

  const hints = profileHints(member);
  const contactEmail = String(formData.get("contact_email") ?? "")
    .trim()
    .toLowerCase();
  if (contactEmail) {
    if (!contactEmail.includes("@")) {
      return { ok: false, code: "validation", error: "請輸入有效的 Email" };
    }
    hints.email = contactEmail;
  } else if (!hints.email?.includes("@")) {
    return { ok: false, code: "validation", error: "請填寫 Email，以便審核與通知" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, code: "validation", error: "請上傳證件影像" };
  }

  const contentType = file.type || "application/octet-stream";
  const validationError = validateVerificationImageFile(file, contentType);
  if (validationError) {
    return { ok: false, code: "validation", error: validationError };
  }

  try {
    const current = await getMemberCredit(memberKey);
    if (current.verification_status === "pending") {
      return {
        ok: true,
        verification_status: "pending",
        message: "您的實名認證已在審核中，請勿重複送出。",
      };
    }

    await touchMemberProfile(memberKey, hints);

    const bytes = Buffer.from(await file.arrayBuffer());
    const contentValidationError = validateVerificationImageContent(bytes, contentType);
    if (contentValidationError) {
      return { ok: false, code: "validation", error: contentValidationError };
    }
    const saved = await saveVerificationImage(bytes, contentType);
    const profile = await submitVerificationRequest(memberKey, saved.id);

    return {
      ok: true,
      verification_status: profile.verification_status ?? "pending",
      message: "已送出實名認證，人工審核約 1–2 個工作天。",
    };
  } catch (e) {
    return {
      ok: false,
      code: "server",
      error: e instanceof Error ? e.message : "上傳失敗",
    };
  }
}

function profileHints(member: MemberSession) {
  return {
    displayName: member.displayName,
    email: member.email,
    lineUid: member.lineUid,
    appleUid: member.appleUid,
    phone: member.phone ?? member.contactPhone,
  };
}
