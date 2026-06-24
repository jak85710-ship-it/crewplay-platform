import type { Booking } from "@/types";

import type { MemberSession } from "@/lib/member-session";
import { normalizePhone } from "@/lib/phone-auth";

export function filterBookingsForMember(bookings: Booking[], member: MemberSession): Booking[] {
  if (!member.isLoggedIn) return [];

  if (member.phone) {
    const phone = member.phone;
    return bookings.filter((b) => normalizePhone(b.guest_phone) === phone);
  }

  if (member.lineUid) {
    return bookings.filter((b) => b.line_uid === member.lineUid);
  }

  if (member.appleUid) {
    return bookings.filter((b) => b.apple_uid === member.appleUid);
  }

  return [];
}

export function emptyBookingsMessage(member: MemberSession): string {
  if (member.method === "phone") {
    return "尚無與此手機號碼相符的預約紀錄。";
  }
  if (member.method === "line") {
    return "尚無與此 LINE 帳號相符的預約紀錄。若先前報名時未登入 LINE，請改用手機驗證碼登入查看。";
  }
  return "尚無預約紀錄。";
}
