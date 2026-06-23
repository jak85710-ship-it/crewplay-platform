"use client";

import Link from "next/link";

type Props = {
  displayName?: string;
  isLoggedIn: boolean;
};

export function MemberAuth({ displayName, isLoggedIn }: Props) {
  if (isLoggedIn && displayName) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/my/bookings"
          className="max-w-[8rem] truncate rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-100"
          title={displayName}
        >
          {displayName}
        </Link>
        <Link
          href="/api/auth/logout"
          className="rounded-lg px-2 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          登出
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
    >
      登入
    </Link>
  );
}
