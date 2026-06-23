"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  searchParams: Promise<{ status?: string; id?: string; tradeNo?: string }>;
}

export default function BookResultPage({ searchParams }: Props) {
  const [params, setParams] = useState<{ status?: string; tradeNo?: string }>({});
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    searchParams.then((p) => {
      setParams({ status: p.status, tradeNo: p.tradeNo });
      if (p.status === "ok" && p.tradeNo) {
        setConfirming(true);
        fetch("/api/bookings/confirm-paid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tradeNo: p.tradeNo }),
        })
          .catch(() => undefined)
          .finally(() => setConfirming(false));
      }
    });
  }, [searchParams]);

  const ok = params.status === "ok" || params.status === "paid";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
          ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {ok ? "✓" : "!"}
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">
        {ok ? "預約成功" : "付款未完成"}
      </h1>
      <p className="mt-3 text-slate-600">
        {ok
          ? confirming
            ? "正在確認付款並寄送通知信…"
            : "我們已收到您的預約，確認信已寄至您的 Email。"
          : "若已扣款但未顯示成功，請聯絡 crew.matchplay@gmail.com 並提供訂單編號。"}
      </p>
      {params.tradeNo && (
        <p className="mt-2 font-mono text-xs text-slate-400">訂單：{params.tradeNo}</p>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/my/bookings" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">
          我的預約
        </Link>
        <Link href="/teams" className="rounded-xl border px-5 py-2.5 text-sm font-semibold">
          繼續找團
        </Link>
      </div>
    </div>
  );
}
