"use client";

import { QRCodeSVG } from "qrcode.react";

import { hostGuestCheckInScanUrl } from "@/lib/check-in-url";

type TeamInfo = {
  id: string;
  arena_name: string;
  sport: string;
  region: string;
  location: string;
};

type Props = {
  portalToken: string;
  team: TeamInfo;
};

export function HostCheckInPortal({ portalToken, team }: Props) {
  const scanUrl = hostGuestCheckInScanUrl(portalToken);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-700">
        CrewPlay 團主核銷
      </p>
      <h1 className="mt-2 text-center text-2xl font-bold text-slate-900">專屬報到 QR Code</h1>
      <p className="mt-2 text-center text-sm text-slate-600">{team.arena_name}</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        <p className="text-sm text-slate-700">請讓球友用手機掃描下方 QR Code 自助完成報到。</p>
        <div className="mx-auto mt-4 inline-block rounded-xl border border-slate-100 bg-white p-3">
          <QRCodeSVG value={scanUrl} size={220} level="M" includeMargin />
        </div>
        <p className="mt-4 text-xs text-slate-500">
          球友掃描後系統會立即顯示「編號」與「報到成功」，你只要看球友手機畫面即可。
        </p>
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-left text-xs text-slate-500">
          <p className="font-semibold text-slate-700">給球友的畫面檢查重點</p>
          <p className="mt-1">1. 有顯示「報到成功」</p>
          <p>2. 有顯示報名編號</p>
        </div>
      </div>
    </div>
  );
}
