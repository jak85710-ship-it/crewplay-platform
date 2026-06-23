import Link from "next/link";
import { cookies } from "next/headers";

import { listBookings } from "@/lib/bookings";
import { getMemberSession } from "@/lib/member-session";
import { normalizePhone } from "@/lib/phone-auth";

export default async function MyBookingsPage() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  const bookings = await listBookings();
  const mine = member.phone
    ? bookings.filter((b) => normalizePhone(b.guest_phone) === member.phone)
    : member.isLoggedIn
      ? bookings.slice(0, 50)
      : [];

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
                : member.method === "line"
                  ? "（LINE）"
                  : member.method === "apple"
                    ? "（Apple）"
                    : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">請使用手機號碼登入以查看您的預約</p>
          )}
        </div>

        {!member.isLoggedIn ? (
          <Link
            href="/login?redirect=/my/bookings"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            手機登入
          </Link>
        ) : (
          <Link href="/api/auth/logout" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm">
            登出
          </Link>
        )}
      </div>

      {!member.isLoggedIn && (
        <p className="mt-6 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          輸入手機號碼取得驗證碼即可登入。
          <Link href="/login?redirect=/my/bookings" className="ml-1 font-semibold underline">
            前往登入
          </Link>
        </p>
      )}

      {member.isLoggedIn && mine.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed p-8 text-center text-slate-500">
          尚無與此手機號碼相符的預約紀錄。
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
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {b.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {b.slots} 人 · NT$ {b.amount} · {b.merchant_trade_no}
              </p>
              <p className="mt-1 text-xs text-slate-400">{b.created_at}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
