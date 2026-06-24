import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createBooking } from "@/lib/bookings";
import { sendBookingSubmittedEmails } from "@/lib/email";
import { getMemberSession } from "@/lib/member-session";
import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const member = getMemberSession(cookieStore);
    const teamId = String(body.team_id ?? "");
    const guestName = String(body.guest_name ?? "").trim();
    const guestPhone = String(body.guest_phone ?? "").trim();
    const guestEmail = String(body.guest_email ?? "").trim();

    if (!guestName || !guestPhone) {
      return NextResponse.json({ error: "請填寫姓名與手機" }, { status: 400 });
    }
    if (!guestEmail || !guestEmail.includes("@")) {
      return NextResponse.json({ error: "請填寫有效的 Email（用於寄送預約通知）" }, { status: 400 });
    }

    const team = await getTeamById(teamId);
    if (!team) return NextResponse.json({ error: "找不到揪團" }, { status: 404 });

    const enriched = enrichTeamFromIntro(team);
    const slots = Math.min(10, Math.max(1, parseInt(String(body.slots ?? 1), 10)));
    const unit = enriched.fee_amount ?? 200;
    const amount = body.amount ? parseInt(String(body.amount), 10) : unit * slots;

    const booking = await createBooking({
      team_id: team.id,
      guest_name: guestName,
      guest_phone: guestPhone,
      guest_email: guestEmail,
      slots,
      amount,
      note: String(body.note ?? ""),
      line_uid: member.method === "line" ? member.lineUid : null,
      apple_uid: member.method === "apple" ? member.appleUid : null,
    });

    await sendBookingSubmittedEmails({
      booking,
      team: {
        arena_name: enriched.arena_name,
        sport: enriched.sport,
        region: enriched.region,
        location: enriched.location,
      },
    });

    return NextResponse.json({ booking });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "建立失敗" },
      { status: 500 }
    );
  }
}
