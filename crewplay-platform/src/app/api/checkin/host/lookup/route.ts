import { NextResponse } from "next/server";

import { getBookingById } from "@/lib/bookings";
import { verifyCheckInToken } from "@/lib/check-in-token";
import { verifyHostPortalToken } from "@/lib/host-portal-token";
import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const portalToken = String(body.portalToken ?? "").trim();
    const guestToken = String(body.guestToken ?? "").trim();

    const portal = verifyHostPortalToken(portalToken);
    if (!portal) {
      return NextResponse.json({ error: "核銷連結無效或已過期" }, { status: 400 });
    }

    const payload = verifyCheckInToken(guestToken);
    if (!payload) {
      return NextResponse.json({ error: "進場條碼無效或已過期" }, { status: 400 });
    }

    const booking = await getBookingById(payload.bookingId);
    if (!booking) {
      return NextResponse.json({ error: "找不到預約" }, { status: 404 });
    }

    if (booking.team_id !== portal.teamId) {
      return NextResponse.json({ error: "此報名不屬於本團，無法核銷" }, { status: 403 });
    }

    const teamRaw = await getTeamById(booking.team_id);
    const team = teamRaw ? enrichTeamFromIntro(teamRaw) : null;

    return NextResponse.json({
      ok: true,
      token: guestToken,
      booking,
      team: team
        ? {
            arena_name: team.arena_name,
            sport: team.sport,
            region: team.region,
            location: team.location,
          }
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "查詢失敗" },
      { status: 500 }
    );
  }
}
