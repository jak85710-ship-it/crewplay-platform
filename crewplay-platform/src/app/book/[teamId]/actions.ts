"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { processMemberBooking } from "@/lib/create-member-booking";
import { applyMemberProfileToCookieStore } from "@/lib/member-session";

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
    },
    cookieStore
  );

  if (!result.ok) {
    if (result.code === "login_required") {
      redirect(`/login?redirect=${encodeURIComponent(`/book/${teamId}`)}&reason=session_expired`);
    }
    return { error: result.error };
  }

  applyMemberProfileToCookieStore(cookieStore, result.profile);

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
  redirect(`/book/result?${q.toString()}`);
}
