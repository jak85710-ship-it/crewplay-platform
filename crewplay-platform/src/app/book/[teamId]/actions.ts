"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { processMemberBooking } from "@/lib/create-member-booking";
import { issueCheckInToken } from "@/lib/check-in-token";
import { applyMemberProfileToCookieStore, setMemberSessionKey } from "@/lib/member-session";

export type BookFormState = {
  error?: string;
};

export async function submitBookingAction(
  _prev: BookFormState,
  formData: FormData
): Promise<BookFormState> {
  const teamId = String(formData.get("team_id") ?? "").trim();
  const cookieStore = await cookies();

  const result = await processMemberBooking(
    {
      team_id: teamId,
      guest_name: String(formData.get("guest_name") ?? ""),
      guest_email: String(formData.get("guest_email") ?? ""),
      guest_phone: String(formData.get("guest_phone") ?? ""),
      slots: parseInt(String(formData.get("slots") ?? "1"), 10) || 1,
      note: String(formData.get("note") ?? ""),
      amount: parseInt(String(formData.get("amount") ?? "0"), 10) || 0,
      booking_auth: String(formData.get("booking_auth") ?? ""),
    },
    cookieStore
  );

  if (!result.ok) {
    if (result.code === "login_required") {
      redirect(`/login?redirect=${encodeURIComponent(`/book/${teamId}`)}`);
    }
    return { error: result.error };
  }

  applyMemberProfileToCookieStore(cookieStore, result.profile);
  setMemberSessionKey(cookieStore, result.memberKey);

  const mailFlag = result.emailStatus.guestNotified
    ? "sent"
    : result.emailStatus.configured
      ? "fail"
      : "off";
  const q = new URLSearchParams({
    status: "ok",
    id: result.booking.id,
    team: teamId,
    email: result.profile.email,
    mail: mailFlag,
  });
  const checkinToken = issueCheckInToken(result.booking);
  if (checkinToken) q.set("checkin", checkinToken);
  redirect(`/book/result?${q.toString()}`);
}
