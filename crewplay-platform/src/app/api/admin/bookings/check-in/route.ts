import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { markBookingCheckedIn } from "@/lib/bookings";
import { verifyCheckInToken } from "@/lib/check-in-token";

export async function POST(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const payload = verifyCheckInToken(token);
    if (!payload) {
      return NextResponse.json({ error: "進場條碼無效或已過期" }, { status: 400 });
    }

    const result = await markBookingCheckedIn(payload.bookingId);
    if (!result.booking) {
      return NextResponse.json({ error: "找不到預約" }, { status: 404 });
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
