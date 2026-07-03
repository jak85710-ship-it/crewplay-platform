import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { VERIFICATION_CONSENT_TEXT } from "@/lib/legal-entity";
import { checkMemberCanMatch, getMemberCredit } from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSession } from "@/lib/member-session";
import { processVerificationSubmit } from "@/lib/submit-member-verification";

export const runtime = "nodejs";

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
  const form = await req.formData();
  const result = await processVerificationSubmit(form, cookieStore);

  if (!result.ok) {
    const status =
      result.code === "login_required" ? 401 : result.code === "validation" ? 400 : 500;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({
    ok: true,
    verification_status: result.verification_status,
    message: result.message,
  });
}
