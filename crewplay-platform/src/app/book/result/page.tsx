"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { feeSummary, parseIntroField } from "@/lib/utils";

interface Props {
  searchParams: Promise<{ status?: string; id?: string; team?: string }>;
}

type TeamInfo = {
  arena_name: string;
  location: string;
  introduce: string;
  fee_amount: number | null;
  fee_label: string;
};

export default function BookResultPage({ searchParams }: Props) {
  const [params, setParams] = useState<{ status?: string; id?: string; team?: string }>({});
  const [team, setTeam] = useState<TeamInfo | null>(null);

  useEffect(() => {
    searchParams.then((p) => {
      setParams(p);
      if (p.team) {
        fetch(`/api/teams/${p.team}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.team) setTeam(data.team);
          });
      }
    });
  }, [searchParams]);

  const ok = params.status === "ok";
  const timeText = team ? parseIntroField(team.introduce, "時間") : "";
  const placeText = team
    ? parseIntroField(team.introduce, "地點") || team.location
    : "";
  const feeText = team ? feeSummary(team) : "";

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
            ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {ok ? "✓" : "!"}
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">{ok ? "報名成功" : "報名未完成"}</h1>
        {team && <p className="mt-2 text-slate-600">{team.arena_name}</p>}
      </div>

      {ok ? (
        <ol className="mt-8 space-y-3">
          <li className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
            <span className="font-bold text-green-700">1</span>
            <div>
              <p className="font-semibold text-green-900">已為你保留名額</p>
              <p className="mt-1 text-green-800">確認信已寄至你的 Email。</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <span className="font-bold text-brand-700">2</span>
            <div>
              <p className="font-semibold text-slate-900">請準時到場</p>
              {timeText && <p className="mt-1 text-slate-600">時間：{timeText}</p>}
              {placeText && <p className="mt-1 text-slate-600">地點：{placeText}</p>}
              {!timeText && !placeText && (
                <p className="mt-1 text-slate-600">詳見揪團介紹或團主聯絡訊息。</p>
              )}
            </div>
          </li>
          <li className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <span className="font-bold text-amber-700">3</span>
            <div>
              <p className="font-semibold text-amber-900">到場向團主付費</p>
              <p className="mt-1 text-amber-800">
                免預付、本站不代收。{feeText ? `參考團費：${feeText}` : "費用請依團主說明。"}
              </p>
            </div>
          </li>
        </ol>
      ) : (
        <p className="mt-6 text-center text-slate-600">
          請返回揪團頁重新填寫，或聯絡 crew.matchplay@gmail.com。
        </p>
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
