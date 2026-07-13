import { NextResponse } from "next/server";

import { verifyAdminKey } from "@/lib/analytics-store";
import { listBookings } from "@/lib/bookings";

export async function GET(req: Request) {
  if (!verifyAdminKey(req)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const bookings = await listBookings();
    return NextResponse.json({
      ok: true,
      bookings: bookings.slice(0, 80),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "載入預約資料失敗" },
      { status: 500 }
    );
  }
}
