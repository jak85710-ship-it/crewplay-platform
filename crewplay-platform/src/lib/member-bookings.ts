import type { Booking } from "@/types";

import type { MemberSession } from "@/lib/member-session";
import { normalizePhone } from "@/lib/phone-auth";

export function filterBookingsForMember(bookings: Booking[], member: MemberSession): Booking[] {
  if (!member.isLoggedIn) return [];

  const email = member.email?.trim().toLowerCase();

  return bookings.filter((b) => {
    if (member.lineUid && b.line_uid === member.lineUid) return true;
    if (member.appleUid && b.apple_uid === member.appleUid) return true;
    if (email && b.guest_email?.trim().toLowerCase() === email) return true;
    if (member.phone) {
      const guestPhone = normalizePhone(b.guest_phone);
      if (guestPhone && guestPhone === member.phone) return true;
    }
    return false;
  });
}

export function emptyBookingsMessage(member: MemberSession): string {
  if (member.method === "line") {
    return "尚無與此 LINE 帳號相符的預約紀錄。";
  }
  if (member.email) {
    return "尚無與此 Email 相符的預約紀錄。";
  }
  return "尚無預約紀錄。";
}
