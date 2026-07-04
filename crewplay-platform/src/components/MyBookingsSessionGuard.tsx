"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function MyBookingsSessionGuard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let closed = false;
    fetch("/api/member/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (closed) return;
        const ok = Boolean(data?.isLoggedIn);
        setLoggedIn(ok);
        setChecking(false);
        if (ok) {
          router.refresh();
        }
      })
      .catch(() => {
        if (closed) return;
        setChecking(false);
      });
    return () => {
      closed = true;
    };
  }, [router]);

  if (checking) {
    return (
      <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        正在同步登入狀態，請稍候…
      </p>
    );
  }

  if (loggedIn) {
    return (
      <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        已確認登入，正在進入我的預約…
      </p>
    );
  }

  return (
    <p className="mt-6 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
      建議使用 LINE 免費登入；也可改用 Email 或手機驗證碼。
      <Link href="/login?redirect=/my/bookings" className="ml-1 font-semibold underline">
        前往登入
      </Link>
    </p>
  );
}
