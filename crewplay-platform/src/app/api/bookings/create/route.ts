import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { cookieReaderFromHeader, mergeCookieReaders } from "@/lib/cookie-reader";
import { processMemberBooking, siteUrlFromRequest, type BookingInput } from "@/lib/create-member-booking";
import { issueCheckInToken } from "@/lib/check-in-token";
import { applyMemberProfileToCookieStore, setMemberSessionKey } from "@/lib/member-session";

function parseBody(raw: Record<string, FormDataEntryValue | unknown>): BookingInput {
  return {
    team_id: String(raw.team_id ?? ""),
    guest_name: String(raw.guest_name ?? ""),
    guest_email: String(raw.guest_email ?? ""),
    guest_phone: String(raw.guest_phone ?? ""),
    slots: parseInt(String(raw.slots ?? "1"), 10) || 1,
    note: String(raw.note ?? ""),
    volleyball_position: String(raw.volleyball_position ?? ""),
    volleyball_position_detail: String(raw.volleyball_position_detail ?? ""),
    amount: parseInt(String(raw.amount ?? "0"), 10) || 0,
    booking_auth: String(raw.booking_auth ?? ""),
  };
}

function isFormRequest(req: Request): boolean {
  const type = req.headers.get("content-type") ?? "";
  return type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data");
}

export async function POST(req: Request) {
  const formMode = isFormRequest(req);
  let input: BookingInput;

  try {
    if (formMode) {
      const fd = await req.formData();
      input = parseBody(Object.fromEntries(fd.entries()));
    } else {
      input = parseBody(await req.json());
    }
  } catch {
    if (formMode) {
      return NextResponse.redirect(`${siteUrlFromRequest(req)}/teams?error=invalid_form`, 303);
    }
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const cookieStore = mergeCookieReaders(
    cookieReaderFromHeader(req.headers.get("cookie")),
    await cookies()
  );
  const result = await processMemberBooking(input, cookieStore);
  const site = siteUrlFromRequest(req);
  const teamId = input.team_id;

  if (!result.ok) {
    if (formMode) {
      if (result.code === "login_required") {
        const loginQ = new URLSearchParams({
          redirect: `/book/${teamId}`,
          reason: "session_expired",
        });
        return NextResponse.redirect(`${site}/login?${loginQ.toString()}`, 303);
      }
      const q = new URLSearchParams({ error: result.error });
      return NextResponse.redirect(`${site}/book/${teamId}?${q.toString()}`, 303);
    }

    const status =
      result.code === "login_required"
        ? 401
        : result.code === "credit_blocked"
          ? 403
          : result.code === "not_found"
            ? 404
            : 400;

    return NextResponse.json(
      {
        error: result.code === "credit_blocked" ? "credit_blocked" : result.error,
        message: result.error,
        credit_score: result.credit_score,
        no_show_count: result.no_show_count,
      },
      { status }
    );
  }

  const mailFlag = result.emailStatus.guestNotified
    ? "sent"
    : result.emailStatus.configured
      ? "fail"
      : "off";
  const resultQ = new URLSearchParams({
    status: "ok",
    id: result.booking.id,
    team: teamId,
    email: result.profile.email,
    mail: mailFlag,
  });
  const checkinToken = issueCheckInToken(result.booking);
  if (checkinToken) resultQ.set("checkin", checkinToken);

  const res = formMode
    ? NextResponse.redirect(`${site}/book/result?${resultQ.toString()}`, 303)
    : NextResponse.json({ booking: result.booking, emailStatus: result.emailStatus });

  applyMemberProfileToCookieStore(res.cookies, result.profile);
  setMemberSessionKey(res.cookies, result.memberKey);
  return res;
}
