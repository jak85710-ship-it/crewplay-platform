import { NextResponse } from "next/server";

import { VERIFICATION_CONSENT_TEXT } from "@/lib/legal-entity";
import {
  checkMemberCanMatch,
  getMemberCredit,
  submitVerificationRequest,
  touchMemberProfile,
} from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";
import { cookies } from "next/headers";
import {
  saveVerificationImage,
  validateVerificationImageFile,
} from "@/lib/verification-images";

export async function GET() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  const memberKey = getMemberKeyFromSession(member);
  if (!memberKey) {
    return NextResponse.json({ error: "請先登入會員" }, { status: 401 });
  }

  const profile = await getMemberCredit(memberKey);
  const matchCheck = await checkMemberCanMatch(memberKey);

  return NextResponse.json({
    ok: true,
    verification_status: profile.verification_status ?? "none",
    rejection_reason: profile.rejection_reason ?? null,
    verified_at: profile.verified_at ?? null,
    match: matchCheck,
    consent_text: VERIFICATION_CONSENT_TEXT,
  });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  const memberKey = getMemberKeyFromSession(member);
  if (!memberKey) {
    return NextResponse.json({ error: "請先登入會員" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const agreed = form.get("agreed") === "true";

    if (!agreed) {
      return NextResponse.json({ error: "請勾選實名認證同意事項" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "請上傳證件影像" }, { status: 400 });
    }

    const contentType = file.type || "application/octet-stream";
    const validationError = validateVerificationImageFile(file, contentType);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await touchMemberProfile(memberKey, {
      displayName: member.displayName,
      email: member.email,
      lineUid: member.lineUid,
      appleUid: member.appleUid,
      phone: member.phone ?? member.contactPhone,
    });

    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveVerificationImage(bytes, contentType);
    const profile = await submitVerificationRequest(memberKey, saved.id);

    return NextResponse.json({
      ok: true,
      verification_status: profile.verification_status,
      message: "已送出實名認證，人工審核約 1–3 個工作天。",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "上傳失敗" },
      { status: 500 }
    );
  }
}
