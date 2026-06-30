import { createBooking } from "@/lib/bookings";
import { memberSessionFromBookingToken } from "@/lib/booking-auth-token";
import type { CookieReader } from "@/lib/cookie-reader";
import { sendBookingSubmittedEmails } from "@/lib/email";
import { checkMemberCanBook, MIN_BOOKING_SCORE, touchMemberProfile } from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { getMemberSessionFromReader, type MemberSession } from "@/lib/member-session";
import { normalizePhone } from "@/lib/phone-auth";
import { enrichTeamFromIntro, getTeamById } from "@/lib/teams";

export type BookingInput = {
  team_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  slots: number;
  note?: string;
  amount: number;
  booking_auth?: string;
};

function resolveMemberSession(
  cookieStore: CookieReader,
  teamId: string,
  bookingAuth?: string | null
): MemberSession {
  const fromCookies = getMemberSessionFromReader(cookieStore);
  if (fromCookies.isLoggedIn) return fromCookies;
  const fromToken = memberSessionFromBookingToken(bookingAuth, teamId);
  return fromToken ?? { isLoggedIn: false };
}

export type BookingSubmitResult =
  | {
      ok: true;
      booking: Awaited<ReturnType<typeof createBooking>>;
      profile: { name: string; email: string; contactPhone: string };
      emailStatus: import("@/lib/email").BookingEmailResult;
    }
  | {
      ok: false;
      code: "login_required" | "validation" | "credit_blocked" | "not_found" | "server";
      error: string;
      credit_score?: number;
      no_show_count?: number;
    };

export async function processMemberBooking(
  raw: BookingInput,
  cookieStore: CookieReader
): Promise<BookingSubmitResult> {
  const teamId = String(raw.team_id ?? "").trim();
  const member = resolveMemberSession(cookieStore, teamId, raw.booking_auth);

  if (!member.isLoggedIn) {
    return {
      ok: false,
      code: "login_required",
      error: "登入已過期，請重新登入後再報名",
    };
  }

  const guestName = String(raw.guest_name ?? member.name ?? member.displayName ?? "").trim();
  const guestEmail = String(raw.guest_email ?? member.email ?? "").trim();
  const guestPhone = normalizePhone(String(raw.guest_phone ?? member.contactPhone ?? member.phone ?? ""));

  if (!guestName) {
    return { ok: false, code: "validation", error: "請填寫姓名" };
  }
  if (!guestEmail || !guestEmail.includes("@")) {
    return {
      ok: false,
      code: "validation",
      error: "請綁定有效的 Email（用於報名通知與帳號識別）",
    };
  }
  if (!guestPhone) {
    return {
      ok: false,
      code: "validation",
      error: "請填寫有效的手機號碼（09 開頭，10 碼），方便團主聯絡",
    };
  }

  const memberKey = getMemberKeyFromSession(member);
  if (!memberKey) {
    return { ok: false, code: "validation", error: "無法識別會員身分，請重新登入" };
  }

  const creditCheck = await checkMemberCanBook(memberKey);
  if (!creditCheck.allowed) {
    return {
      ok: false,
      code: "credit_blocked",
      error: `信用分不足（${creditCheck.credit_score} / 最低 ${MIN_BOOKING_SCORE}），暫時無法報名。`,
      credit_score: creditCheck.credit_score,
      no_show_count: creditCheck.no_show_count,
    };
  }

  const team = await getTeamById(teamId);
  if (!team) {
    return { ok: false, code: "not_found", error: "找不到揪團" };
  }

  try {
    const enriched = enrichTeamFromIntro(team);
    const slots = Math.min(10, Math.max(1, parseInt(String(raw.slots ?? 1), 10) || 1));
    const unit = enriched.fee_amount ?? 200;
    const amount = unit * slots;

    const booking = await createBooking({
      team_id: team.id,
      guest_name: guestName,
      guest_phone: guestPhone,
      guest_email: guestEmail,
      slots,
      amount,
      note: String(raw.note ?? ""),
      member_key: memberKey,
      line_uid: member.method === "line" ? member.lineUid : null,
      apple_uid: member.method === "apple" ? member.appleUid : null,
    });

    await touchMemberProfile(memberKey, {
      displayName: guestName,
      email: guestEmail,
      lineUid: member.lineUid,
      appleUid: member.appleUid,
      phone: guestPhone,
    });

    let emailStatus: import("@/lib/email").BookingEmailResult = {
      configured: false,
      adminNotified: false,
      guestNotified: false,
    };
    try {
      emailStatus = await sendBookingSubmittedEmails({
        booking,
        team: {
          id: enriched.id,
          arena_name: enriched.arena_name,
          sport: enriched.sport,
          region: enriched.region,
          location: enriched.location,
          introduce: enriched.introduce,
          fee_amount: enriched.fee_amount,
          fee_label: enriched.fee_label,
        },
      });
    } catch (mailErr) {
      console.error("booking email failed (booking still saved):", mailErr);
      emailStatus = {
        configured: true,
        adminNotified: false,
        guestNotified: false,
        error: mailErr instanceof Error ? mailErr.message : "send_failed",
      };
    }

    return {
      ok: true,
      booking,
      profile: { name: guestName, email: guestEmail, contactPhone: guestPhone },
      emailStatus,
    };
  } catch (e) {
    return {
      ok: false,
      code: "server",
      error: e instanceof Error ? e.message : "建立失敗",
    };
  }
}

export function siteUrlFromRequest(req: Request): string {
  const hostRaw = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const host = hostRaw.split(",")[0]?.trim();
  if (host && (host === "crewplay.tw" || host.endsWith(".crewplay.tw"))) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const fallbackHost = host || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (fallbackHost.includes("localhost") ? "http" : "https");
  return `${proto}://${fallbackHost}`;
}
