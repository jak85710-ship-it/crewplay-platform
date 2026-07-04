"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  displayName?: string;
  isLoggedIn: boolean;
};

function loginHref(pathname: string, search: string): string {
  const path = search ? `${pathname}?${search}` : pathname;
  if (!path || path === "/login" || path.startsWith("/login?")) return "/login";
  return `/login?redirect=${encodeURIComponent(path)}`;
}

export function MemberAuth({ displayName, isLoggedIn }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [liveAuth, setLiveAuth] = useState<{ isLoggedIn: boolean; displayName?: string }>({
    isLoggedIn,
    displayName,
  });

  useEffect(() => {
    setLiveAuth({ isLoggedIn, displayName });
  }, [isLoggedIn, displayName]);

  useEffect(() => {
    let closed = false;
    fetch("/api/member/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (closed || !data) return;
        setLiveAuth({
          isLoggedIn: Boolean(data.isLoggedIn),
          displayName: data.displayName || data.name || undefined,
        });
      })
      .catch(() => {});
    return () => {
      closed = true;
    };
  }, [pathname, search]);

  if (liveAuth.isLoggedIn && liveAuth.displayName) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/my/bookings"
          className="max-w-[8rem] truncate rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-100"
          title={liveAuth.displayName}
        >
          {liveAuth.displayName}
        </Link>
        <form method="POST" action="/api/auth/logout">
          <button
            type="submit"
            className="rounded-lg px-2 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            登出
          </button>
        </form>
      </div>
    );
  }

  return (
    <Link
      href={loginHref(pathname, search)}
      className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
    >
      登入
    </Link>
  );
}
