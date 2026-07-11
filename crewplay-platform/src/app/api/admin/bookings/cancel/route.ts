import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { cancelBookingByAdmin } from "@/lib/bookings";

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

    const result = await cancelBookingByAdmin(bookingId);
    if (!result.ok) {
      const status =
        result.code === "not_found"
          ? 404
          : result.code === "checked_in"
            ? 409
            : result.code === "invalid_status"
              ? 400
              : 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({
      ok: true,
      already_cancelled: result.alreadyCancelled,
      booking: result.booking,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "取消失敗" },
      { status: 500 }
    );
  }
}
