import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { bookingReference } from "@/lib/booking-ref";
import { listBookings, markBookingCheckedIn } from "@/lib/bookings";
import { filterBookingsForMember } from "@/lib/member-bookings";
import { getMemberSession } from "@/lib/member-session";
import { verifyHostPortalToken } from "@/lib/host-portal-token";
import type { Booking } from "@/types";

const CHECK_IN_ALLOWED_STATUS = new Set<Booking["status"]>(["submitted", "pending_payment", "paid"]);

function isGuestCheckInCandidate(booking: Booking, teamId: string): boolean {
  if (booking.team_id !== teamId) return false;
  if (booking.checked_in_at) return true;
  return CHECK_IN_ALLOWED_STATUS.has(booking.status);
}

function sortCandidate(a: Booking, b: Booking): number {
  const aChecked = Boolean(a.checked_in_at);
  const bChecked = Boolean(b.checked_in_at);
  if (aChecked !== bChecked) return aChecked ? 1 : -1;
  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
  return bTime - aTime;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const portalToken = String(body.portalToken ?? "").trim();

    const portal = verifyHostPortalToken(portalToken);
    if (!portal) {
      return NextResponse.json({ error: "報到 QR Code 無效或已過期" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const member = getMemberSession(cookieStore);
    if (!member.isLoggedIn) {
      return NextResponse.json({ error: "請先登入後再掃描報到", code: "auth_required" }, { status: 401 });
    }

    const bookings = await listBookings();
    const mine = filterBookingsForMember(bookings, member);
    const candidates = mine.filter((booking) => isGuestCheckInCandidate(booking, portal.teamId)).sort(sortCandidate);
    const target = candidates[0];
    if (!target) {
      return NextResponse.json(
        {
          error: "找不到此揪團可報到的預約，請先確認登入帳號是否正確",
          code: "booking_not_found",
        },
        { status: 404 }
      );
    }

    const result = await markBookingCheckedIn(target.id);
    if (!result.booking) {
      return NextResponse.json({ error: "找不到預約資料", code: "booking_missing" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      already_checked_in: result.alreadyCheckedIn,
      reference: bookingReference(result.booking),
      booking: {
        id: result.booking.id,
        guest_name: result.booking.guest_name,
        team_id: result.booking.team_id,
        checked_in_at: result.booking.checked_in_at,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "報到失敗，請稍後重試" },
      { status: 500 }
    );
  }
}
