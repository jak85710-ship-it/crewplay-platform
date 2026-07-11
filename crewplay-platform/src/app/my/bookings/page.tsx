import Link from "next/link";
import { cookies } from "next/headers";

import { MyBookingCard } from "@/components/MyBookingCard";
import { MyBookingsSessionGuard } from "@/components/MyBookingsSessionGuard";
import { formatCreditRecoveryHint } from "@/lib/credit-recovery";
import { listBookings } from "@/lib/bookings";
import {
  CANCEL_BOOKING_PENALTY,
  checkMemberCanBook,
  MIN_BOOKING_SCORE,
} from "@/lib/member-credit";
import { getMemberKeyFromSession } from "@/lib/member-key";
import { emptyBookingsMessage, filterBookingsForMember } from "@/lib/member-bookings";
import { getMemberSession } from "@/lib/member-session";

export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const cookieStore = await cookies();
  const member = getMemberSession(cookieStore);

  const bookings = await listBookings();
  const mine = filterBookingsForMember(bookings, member);

  const memberKey = getMemberKeyFromSession(member);
  const credit = memberKey ? await checkMemberCanBook(memberKey) : null;

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
          <span className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-500">
            登入狀態檢查中
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/my/host" className="rounded-xl border border-brand-300 px-4 py-2.5 text-sm text-brand-700">
              我的開團管理
            </Link>
            <form method="POST" action="/api/auth/logout">
              <button type="submit" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm">
                登出
              </button>
            </form>
          </div>
        )}
      </div>

      {!member.isLoggedIn && (
        <MyBookingsSessionGuard />
      )}

      {member.isLoggedIn && credit && (
        <div
          className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
            credit.allowed
              ? "border-slate-200 bg-slate-50 text-slate-700"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <p className="font-semibold">信用分 {credit.credit_score} / 100</p>
          <p className="mt-1">
            爽約 {credit.no_show_count} 次 · 取消 {credit.cancel_count} 次
            {credit.allowed
              ? ` · 低於 ${MIN_BOOKING_SCORE} 分將暫停報名`
              : ` · 已低於 ${MIN_BOOKING_SCORE} 分，暫時無法報名新團`}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            取消預約將扣 {CANCEL_BOOKING_PENALTY} 分。{formatCreditRecoveryHint(credit.recovery)}
          </p>
        </div>
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
            <MyBookingCard key={b.id} booking={b} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
