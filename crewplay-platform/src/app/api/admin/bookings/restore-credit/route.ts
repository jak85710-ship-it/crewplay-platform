import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { revertBookingNoShow } from "@/lib/bookings";
import { NO_SHOW_PENALTY, restoreNoShowPenalty } from "@/lib/member-credit";

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

    const revert = await revertBookingNoShow(bookingId);
    if (!revert.ok) {
      const status = revert.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: revert.error, code: revert.code }, { status });
    }

    if (!revert.memberKey) {
      return NextResponse.json({ error: "此筆預約無法辨識會員，無法回復扣分" }, { status: 400 });
    }

    const profile = await restoreNoShowPenalty(revert.memberKey);
    return NextResponse.json({
      ok: true,
      booking: revert.booking,
      member_key: revert.memberKey,
      restored_points: NO_SHOW_PENALTY,
      credit_score: profile.credit_score,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "回復失敗" },
      { status: 500 }
    );
  }
}
