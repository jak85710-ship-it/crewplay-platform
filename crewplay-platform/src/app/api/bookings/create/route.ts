import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createBooking } from "@/lib/bookings";
import { sendBookingSubmittedEmails } from "@/lib/email";
import { getMemberSession, setMemberProfileCookies } from "@/lib/member-session";
import { normalizePhone } from "@/lib/phone-auth";
import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const member = getMemberSession(cookieStore);

    if (!member.isLoggedIn) {
      return NextResponse.json({ error: "login_required", message: "請先登入再報名" }, { status: 401 });
    }

    const teamId = String(body.team_id ?? "");
    const guestName = String(body.guest_name ?? member.name ?? member.displayName ?? "").trim();
    const guestEmail = String(body.guest_email ?? member.email ?? "").trim();
    const guestPhoneRaw = String(body.guest_phone ?? member.contactPhone ?? member.phone ?? "").trim();
    const guestPhone = guestPhoneRaw ? (normalizePhone(guestPhoneRaw) ?? guestPhoneRaw) : "";

    if (!guestName) {
      return NextResponse.json({ error: "請填寫姓名" }, { status: 400 });
    }
    if (!guestEmail || !guestEmail.includes("@")) {
      return NextResponse.json(
        { error: "請綁定有效的 Email（用於報名通知與帳號識別）" },
        { status: 400 }
      );
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

    const res = NextResponse.json({ booking });
    setMemberProfileCookies(res, {
      name: guestName,
      email: guestEmail,
      contactPhone: guestPhone || undefined,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "建立失敗" },
      { status: 500 }
    );
  }
}
