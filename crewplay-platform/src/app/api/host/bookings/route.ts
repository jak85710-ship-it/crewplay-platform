import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { bookingReference } from "@/lib/booking-ref";
import { listBookings } from "@/lib/bookings";
import { processBookingReviewSla, reviewBookingAsHost } from "@/lib/booking-review-sla";
import { listOwnedTeamsForMember } from "@/lib/host-team-access";
import { getMemberSession } from "@/lib/member-session";
import { getSafetyCovenantMapByBookingIds } from "@/lib/safety-covenant";

export async function GET() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }

  await processBookingReviewSla();
  const [ownedTeams, bookings] = await Promise.all([listOwnedTeamsForMember(member), listBookings()]);
  const teamSet = new Set(ownedTeams.map((team) => team.id));
  const pendingBookings = bookings
    .filter((booking) => teamSet.has(booking.team_id) && booking.status === "submitted")
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  const safetyMap = await getSafetyCovenantMapByBookingIds(pendingBookings.map((b) => b.id));
  const pending = pendingBookings
    .map((booking) => ({
      id: booking.id,
      team_id: booking.team_id,
      reference: bookingReference(booking),
      guest_name: booking.guest_name,
      guest_phone: booking.guest_phone,
      guest_email: booking.guest_email,
      slots: booking.slots,
      created_at: booking.created_at || "",
      note: booking.note || "",
      safety_shield: Boolean(safetyMap[booking.id]),
      safety_accepted_at: safetyMap[booking.id]?.accepted_at || "",
      safety_policy_version: safetyMap[booking.id]?.policy_version || "",
    }));

  return NextResponse.json({ pending });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);
  if (!member.isLoggedIn) {
    return NextResponse.json({ error: "請先登入團主帳號" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        booking_id?: string;
        action?: "approve" | "reject";
      }
    | null;
  const bookingId = String(body?.booking_id || "").trim();
  const action = body?.action;
  if (!bookingId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "缺少 booking_id 或 action" }, { status: 400 });
  }

  const result = await reviewBookingAsHost({ member, bookingId, action });
  if (!result.ok) {
    const status =
      result.code === "not_found"
        ? 404
        : result.code === "forbidden" || result.code === "unauthorized"
          ? 403
          : result.code === "already_reviewed" || result.code === "already_cancelled" || result.code === "invalid_status"
            ? 409
            : 500;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({
    ok: true,
    booking: result.booking,
    full_auto_rejected: result.fullAutoRejected,
  });
}
