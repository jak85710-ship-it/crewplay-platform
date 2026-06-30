import { NextResponse } from "next/server";

import { markBookingCheckedIn } from "@/lib/bookings";
import { verifyCheckInToken } from "@/lib/check-in-token";
import { verifyHostCheckInSession } from "@/lib/host-checkin-session";
import { verifyStaffPhoneOtp } from "@/lib/staff-phone-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const payload = verifyCheckInToken(token);
    if (!payload) {
      return NextResponse.json({ error: "進場條碼無效或已過期" }, { status: 400 });
    }

    const hostSession = verifyHostCheckInSession(req);
    if (!hostSession) {
      const auth = verifyStaffPhoneOtp(req, String(body.phone ?? ""), String(body.code ?? ""));
      if (!auth.ok) {
        const res = NextResponse.json({ error: auth.error || "未授權" }, { status: 401 });
        if (auth.setCookie) res.headers.set("Set-Cookie", auth.setCookie);
        return res;
      }
    }

    const result = await markBookingCheckedIn(payload.bookingId);
    if (!result.booking) {
      return NextResponse.json({ error: "找不到預約" }, { status: 404 });
    }

    if (hostSession && result.booking.team_id !== hostSession.teamId) {
      return NextResponse.json({ error: "此報名不屬於本團，無法核銷" }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      already_checked_in: result.alreadyCheckedIn,
      booking: result.booking,
      reference: payload.ref,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "核銷失敗" },
      { status: 500 }
    );
  }
}
