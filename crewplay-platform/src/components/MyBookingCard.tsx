import Link from "next/link";

import { BookingCheckInQr } from "@/components/BookingCheckInQr";
import { bookingReference } from "@/lib/booking-ref";
import { issueCheckInToken } from "@/lib/check-in-token";
import { getTeamById } from "@/lib/teams";
import type { Booking } from "@/types";

function bookingStatusLabel(status: string, checkedInAt?: string | null): string {
  if (checkedInAt) return "已進場";
  switch (status) {
    case "submitted":
      return "已送出";
    case "pending_payment":
      return "待付款";
    case "paid":
      return "已確認";
    case "cancelled":
      return "已取消";
    case "refunded":
      return "已退款";
    case "no_show":
      return "爽約";
    default:
      return status;
  }
}

export async function MyBookingCard({ booking }: { booking: Booking }) {
  const ref = bookingReference(booking);
  const token = issueCheckInToken(booking);
  const team = await getTeamById(booking.team_id);
  const checkedIn = Boolean(booking.checked_in_at);

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold">{booking.guest_name}</span>
          {team && (
            <p className="mt-1 text-sm text-slate-600">{team.arena_name}</p>
          )}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            checkedIn
              ? "bg-green-100 text-green-800"
              : booking.status === "no_show"
                ? "bg-red-100 text-red-800"
                : booking.status === "pending_payment"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-brand-100 text-brand-800"
          }`}
        >
          {bookingStatusLabel(booking.status, booking.checked_in_at)}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {booking.slots} 人 · 參考團費 NT$ {booking.amount}
      </p>
      <p className="mt-1 font-mono text-xs text-slate-500">報名編號 {ref}</p>
      <p className="mt-1 text-xs text-slate-400">{booking.created_at}</p>

      {token && !checkedIn && booking.status !== "no_show" && booking.status !== "cancelled" && (
        <div className="mt-4">
          <BookingCheckInQr token={token} reference={ref} compact />
        </div>
      )}

      {team && (
        <Link
          href={`/teams/${team.id}`}
          className="mt-4 inline-block text-sm text-brand-600 hover:underline"
        >
          查看揪團詳情
        </Link>
      )}
    </li>
  );
}
