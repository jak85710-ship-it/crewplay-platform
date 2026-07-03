import type { Booking } from "@/types";

import type { MemberSession } from "@/lib/member-session";
import { normalizePhone } from "@/lib/phone-auth";

export function getMemberKeyFromSession(member: MemberSession): string | null {
  if (!member.isLoggedIn) return null;
  if (member.lineUid) return `line:${member.lineUid}`;
  if (member.email) return `email:${member.email.trim().toLowerCase()}`;
  if (member.phone) return `phone:${member.phone}`;
  if (member.appleUid) return `apple:${member.appleUid}`;
  return null;
}

export function getMemberKeyFromBooking(booking: Booking): string | null {
  if (booking.member_key) return booking.member_key;
  if (booking.line_uid) return `line:${booking.line_uid}`;
  if (booking.apple_uid) return `apple:${booking.apple_uid}`;
  const email = booking.guest_email?.trim().toLowerCase();
  if (email && email.includes("@")) return `email:${email}`;
  const phone = normalizePhone(booking.guest_phone);
  if (phone) return `phone:${phone}`;
  return null;
}

export function bookingBelongsToMemberKey(booking: Booking, memberKey: string): boolean {
  return getMemberKeyFromBooking(booking) === memberKey;
}
