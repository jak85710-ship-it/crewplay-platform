import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { cookieReaderFromHeader, mergeCookieReaders } from "@/lib/cookie-reader";
import { siteUrlFromRequest } from "@/lib/create-member-booking";
import { VERIFICATION_CONSENT_TEXT } from "@/lib/legal-entity";
import { checkMemberCanMatch, getMemberCredit } from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { applyMemberProfileToCookieStore, getMemberSessionFromReader } from "@/lib/member-session";
import { processVerificationSubmit } from "@/lib/submit-member-verification";
import { memberSessionFromVerificationToken } from "@/lib/verification-auth-token";

export const runtime = "nodejs";

async function cookiesFromRequest(req: Request) {
  return mergeCookieReaders(
    cookieReaderFromHeader(req.headers.get("cookie")),
    await cookies()
  );
}

function isFormRequest(req: Request): boolean {
  const type = req.headers.get("content-type") ?? "";
  return type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded");
}

function safeMatchRedirect(path: string): string | null {
  return path.startsWith("/match/") && !path.startsWith("//") ? path : null;
}

function verifyPageUrl(afterVerify: string | null, extra?: Record<string, string>): string {
  const q = new URLSearchParams(extra);
  if (afterVerify) q.set("redirect", afterVerify);
  const qs = q.toString();
  return qs ? `/match/verify?${qs}` : "/match/verify";
}

function pendingPageUrl(afterVerify: string | null): string {
  if (!afterVerify) return "/match/verify/pending";
  return `/match/verify/pending?redirect=${encodeURIComponent(afterVerify)}`;
}

export async function GET(req: Request) {
  const cookieStore = await cookiesFromRequest(req);
  const member = getMemberSessionFromReader(cookieStore);
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
  const formMode = isFormRequest(req);
  const form = await req.formData();
  const cookieStore = await cookiesFromRequest(req);
  const memberFromCookie = getMemberSessionFromReader(cookieStore);
  const token = String(form.get("verify_auth") ?? "").trim();
  const memberFromToken = memberSessionFromVerificationToken(token);
  const activeMember = memberFromCookie.isLoggedIn ? memberFromCookie : memberFromToken;
  const result = await processVerificationSubmit(form, cookieStore, activeMember);
  const site = siteUrlFromRequest(req);
  const afterVerify = safeMatchRedirect(String(form.get("redirect_after") ?? "").trim());

  if (!result.ok) {
    if (formMode) {
      if (result.code === "login_required") {
        const loginRedirect = verifyPageUrl(afterVerify);
        const loginQ = new URLSearchParams({
          redirect: loginRedirect,
          reason: "session_expired",
        });
        return NextResponse.redirect(`${site}/login?${loginQ.toString()}`, 303);
      }
      return NextResponse.redirect(
        `${site}${verifyPageUrl(afterVerify, { error: result.error })}`,
        303
      );
    }

    const status =
      result.code === "login_required" ? 401 : result.code === "validation" ? 400 : 500;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  if (formMode) {
    const contactEmail = String(form.get("contact_email") ?? "").trim().toLowerCase();
    const res = NextResponse.redirect(`${site}${pendingPageUrl(afterVerify)}`, 303);
    applyMemberProfileToCookieStore(res.cookies, {
      name: activeMember?.displayName,
      email: contactEmail || activeMember?.email,
      contactPhone: activeMember?.contactPhone ?? activeMember?.phone,
    });
    return res;
  }

  return NextResponse.json({
    ok: true,
    verification_status: result.verification_status,
    message: result.message,
  });
}
