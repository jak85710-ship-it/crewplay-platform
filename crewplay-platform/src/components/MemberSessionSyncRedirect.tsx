"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  targetPath: string;
};

export function MemberSessionSyncRedirect({ targetPath }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"checking" | "to_login" | "to_target">("checking");

  useEffect(() => {
    let closed = false;
    fetch("/api/member/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (closed) return;
        if (data?.isLoggedIn) {
          setMode("to_target");
          router.replace(targetPath);
          router.refresh();
          return;
        }
        setMode("to_login");
      })
      .catch(() => {
        if (closed) return;
        setMode("to_login");
      });
    return () => {
      closed = true;
    };
  }, [router, targetPath]);

  if (mode === "checking") {
    return (
      <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        正在確認登入狀態，請稍候…
      </p>
    );
  }

  if (mode === "to_target") {
    return (
      <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        已確認登入，正在進入頁面…
      </p>
    );
  }

  return (
    <p className="mt-6 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
      目前尚未登入，請重新登入後繼續。
      <Link href={`/login?redirect=${encodeURIComponent(targetPath)}`} className="ml-1 font-semibold underline">
        前往登入
      </Link>
    </p>
  );
}
