import { NextResponse } from "next/server";

import { markBookingCheckedIn } from "@/lib/bookings";
import { verifyCheckInToken } from "@/lib/check-in-token";
import { verifyHostPortalToken } from "@/lib/host-portal-token";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const portalToken = String(body.portalToken ?? "").trim();

    const portal = verifyHostPortalToken(portalToken);
    if (!portal) {
      return NextResponse.json({ error: "核銷連結無效或已過期" }, { status: 401 });
    }

    const payload = verifyCheckInToken(token);
    if (!payload) {
      return NextResponse.json({ error: "進場條碼無效或已過期" }, { status: 400 });
    }

    const result = await markBookingCheckedIn(payload.bookingId);
    if (!result.booking) {
      return NextResponse.json({ error: "找不到預約" }, { status: 404 });
    }

    if (result.booking.team_id !== portal.teamId) {
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
