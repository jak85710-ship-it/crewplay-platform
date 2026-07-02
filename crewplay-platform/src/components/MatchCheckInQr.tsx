"use client";

import { QRCodeSVG } from "qrcode.react";

type Props = {
  url: string;
  matchId: string;
  compact?: boolean;
};

export function MatchCheckInQr({ url, matchId, compact = false }: Props) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white text-center ${
        compact ? "p-4" : "p-6 shadow-sm"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">1V1 到場條碼</p>
      <p className="mt-1 font-mono text-sm font-bold text-slate-900">{matchId.slice(0, 8).toUpperCase()}</p>
      <div className="mx-auto mt-4 inline-block rounded-xl border border-slate-100 bg-white p-3">
        <QRCodeSVG value={url} size={compact ? 160 : 200} level="M" includeMargin />
      </div>
      {!compact && (
        <p className="mt-4 text-sm text-slate-600">
          到場時請出示此 QR Code，供萬拓乒乓櫃檯或管理員掃描核銷。
        </p>
      )}
    </div>
  );
}
