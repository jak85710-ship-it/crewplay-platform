"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { BookingSuccessIllustration } from "@/components/BookingSuccessIllustration";
import { bookingReference } from "@/lib/booking-ref";
import { feeSummary, parseIntroField } from "@/lib/utils";

interface Props {
  searchParams: Promise<{
    status?: string;
    id?: string;
    team?: string;
    email?: string;
    mail?: string;
  }>;
}

type TeamInfo = {
  arena_name: string;
  location: string;
  introduce: string;
  fee_amount: number | null;
  fee_label: string;
};

export default function BookResultPage({ searchParams }: Props) {
  const params = use(searchParams);
  const [team, setTeam] = useState<TeamInfo | null>(null);

  useEffect(() => {
    if (params.team) {
      fetch(`/api/teams/${params.team}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.team) setTeam(data.team);
        });
    }
  }, [params.team]);

  const ok = params.status === "ok";
  const bookingRef = params.id ? bookingReference({ id: params.id, merchant_trade_no: null }) : "";
  const guestEmail = params.email ?? "";
  const mailStatus = params.mail ?? "";
  const timeText = team ? parseIntroField(team.introduce, "時間") : "";
  const placeText = team
    ? parseIntroField(team.introduce, "地點") || team.location
    : "";
  const feeText = team ? feeSummary(team) : "";

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="text-center">
        {ok ? (
          <BookingSuccessIllustration className="mx-auto h-auto w-full max-w-xs" />
        ) : (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl text-red-700">
            !
          </div>
        )}
        <h1 className="mt-6 text-2xl font-bold text-slate-900">{ok ? "報名成功！" : "報名未完成"}</h1>
        {team && <p className="mt-2 text-slate-600">{team.arena_name}</p>}
        {ok && bookingRef && (
          <p className="mt-1 text-xs text-slate-500">報名編號 {bookingRef}</p>
        )}
      </div>

      {ok && mailStatus === "sent" && guestEmail && (
        <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          確認信已寄至 <span className="font-semibold">{guestEmail}</span>，請查收（含垃圾郵件匣）。
        </p>
      )}
      {ok && mailStatus === "off" && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          報名已保留，但 Email 通知尚未設定。如需確認信請聯絡 crew.matchplay@gmail.com。
        </p>
      )}
      {ok && mailStatus === "fail" && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          報名已成功，但確認信寄送失敗。您的名額仍已保留，請至「我的預約」查看。
        </p>
      )}

      {ok ? (
        <ol className="mt-8 space-y-3">
          <li className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
            <span className="font-bold text-green-700">1</span>
            <div>
              <p className="font-semibold text-green-900">已為你保留名額</p>
              <p className="mt-1 text-green-800">
                {mailStatus === "sent"
                  ? "Email 確認信已寄出。"
                  : "團主可透過您留的手機與 Email 聯絡。"}
              </p>
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
