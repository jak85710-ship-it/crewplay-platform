import Link from "next/link";
import { cookies } from "next/headers";

import { listBookings } from "@/lib/bookings";
import { emptyBookingsMessage, filterBookingsForMember } from "@/lib/member-bookings";
import { getMemberSession } from "@/lib/member-session";

function bookingStatusLabel(status: string): string {
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
    default:
      return status;
  }
}

export default async function MyBookingsPage() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  const bookings = await listBookings();
  const mine = filterBookingsForMember(bookings, member);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">我的預約</h1>
          {member.isLoggedIn ? (
            <p className="mt-2 text-sm text-slate-600">
              已登入：{member.displayName}
              {member.method === "phone"
                ? "（手機）"
                : member.method === "email"
                  ? "（Email）"
                  : member.method === "line"
                  ? "（LINE）"
                  : member.method === "apple"
                    ? "（Apple）"
                    : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">請先登入以查看您的預約（建議使用 LINE）</p>
          )}
        </div>

        {!member.isLoggedIn ? (
          <Link
            href="/login?redirect=/my/bookings"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            登入
          </Link>
        ) : (
          <Link href="/api/auth/logout" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm">
            登出
          </Link>
        )}
      </div>

      {!member.isLoggedIn && (
        <p className="mt-6 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          建議使用 LINE 免費登入；也可改用手機驗證碼。
          <Link href="/login?redirect=/my/bookings" className="ml-1 font-semibold underline">
            前往登入
          </Link>
        </p>
      )}

      {member.isLoggedIn && mine.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed p-8 text-center text-slate-500">
          {emptyBookingsMessage(member)}
          <Link href="/teams" className="text-brand-600 underline">
            去找團
          </Link>
        </p>
      ) : member.isLoggedIn ? (
        <ul className="mt-8 space-y-4">
          {mine.map((b) => (
            <li key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{b.guest_name}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    b.status === "paid"
                      ? "bg-green-100 text-green-800"
                      : b.status === "pending_payment"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-brand-100 text-brand-800"
                  }`}
                >
                  {bookingStatusLabel(b.status)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {b.slots} 人 · 參考團費 NT$ {b.amount}
              </p>
              <p className="mt-1 text-xs text-slate-400">{b.created_at}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
