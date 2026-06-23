"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  searchParams: Promise<{ kind?: string; status?: string; tradeNo?: string }>;
}

export default function JoinResultPage({ searchParams }: Props) {
  const [params, setParams] = useState<{ kind?: string; status?: string; tradeNo?: string }>({});

  useEffect(() => {
    searchParams.then(setParams);
  }, [searchParams]);

  const ok = params.status === "ok";
  const kindLabel =
    params.kind === "host" ? "開團申請" : params.kind === "venue" ? "場地刊登" : "申請";

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
        {ok ? `${kindLabel}付款成功` : "付款未完成"}
      </h1>
      <p className="mt-3 text-slate-600">
        {ok
          ? "我們已收到您的刊登費，申請資料已送達。確認信將寄至您填寫的聯絡方式，媒合成功後會再次通知。"
          : "若已扣款但未顯示成功，請聯絡 crew.matchplay@gmail.com 並提供訂單編號。"}
      </p>
      {params.tradeNo && (
        <p className="mt-2 font-mono text-xs text-slate-400">訂單：{params.tradeNo}</p>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">
          返回首頁
        </Link>
        <Link href="/teams" className="rounded-xl border px-5 py-2.5 text-sm font-semibold">
          瀏覽揪團
        </Link>
      </div>
    </div>
  );
}
