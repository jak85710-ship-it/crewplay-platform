"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  searchParams: Promise<{ status?: string; id?: string }>;
}

export default function BookResultPage({ searchParams }: Props) {
  const [params, setParams] = useState<{ status?: string; id?: string }>({});

  useEffect(() => {
    searchParams.then(setParams);
  }, [searchParams]);

  const ok = params.status === "ok";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
          ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {ok ? "✓" : "!"}
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">{ok ? "預約已送出" : "預約未完成"}</h1>
      <p className="mt-3 text-slate-600">
        {ok
          ? "我們已收到您的報名，確認信已寄至您的 Email。團主將與您聯繫，團費請依揪團說明向團主繳交。"
          : "請返回揪團頁重新填寫，或聯絡 crew.matchplay@gmail.com。"}
      </p>
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
