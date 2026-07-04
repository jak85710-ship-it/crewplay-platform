import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { cancelBookingByMember } from "@/lib/bookings";
import { memberKeyFromCancelBookingToken } from "@/lib/cancel-booking-auth-token";
import {
  CREDIT_RECOVERY_INTERVAL_DAYS,
  CREDIT_RECOVERY_POINTS,
} from "@/lib/member-credit-constants";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { applyMemberProfileToCookieStore, getMemberSession, setMemberSessionKey } from "@/lib/member-session";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  try {
    const body = await req.json();
    const bookingId = String(body.booking_id ?? "").trim();
    const cancelAuth = String(body.cancel_auth ?? "").trim();
    if (!bookingId) {
      return NextResponse.json({ error: "請提供預約編號" }, { status: 400 });
    }

    const memberKey =
      getMemberKeyFromSession(member) || memberKeyFromCancelBookingToken(cancelAuth, bookingId);
    if (!memberKey) {
      return NextResponse.json({ error: "請先登入會員" }, { status: 401 });
    }

    const result = await cancelBookingByMember(bookingId, memberKey);
    if (!result.ok) {
      const status =
        result.code === "forbidden"
          ? 403
          : result.code === "not_found"
            ? 404
            : 400;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    const res = NextResponse.json({
      ok: true,
      booking_id: result.booking.id,
      credit_score: result.credit_score,
      penalty: result.penalty,
      message: `已取消預約，信用分 -${result.penalty}（目前 ${result.credit_score} 分）。每 ${CREDIT_RECOVERY_INTERVAL_DAYS} 天自動回補 ${CREDIT_RECOVERY_POINTS} 分。`,
    });
    applyMemberProfileToCookieStore(res.cookies, {
      name: result.booking.guest_name,
      email: result.booking.guest_email,
      contactPhone: result.booking.guest_phone,
    });
    setMemberSessionKey(res.cookies, memberKey);
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "取消失敗" },
      { status: 500 }
    );
  }
}
