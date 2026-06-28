import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { markBookingNoShow } from "@/lib/bookings";

export async function POST(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const bookingId = String(body.booking_id ?? "").trim();
    if (!bookingId) {
      return NextResponse.json({ error: "缺少 booking_id" }, { status: 400 });
    }

    const result = await markBookingNoShow(bookingId);
    if (!result.booking) {
      return NextResponse.json({ error: "找不到預約" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      already_marked: result.alreadyMarked,
      booking: result.booking,
      member_key: result.memberKey,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "標記失敗" },
      { status: 500 }
    );
  }
}
